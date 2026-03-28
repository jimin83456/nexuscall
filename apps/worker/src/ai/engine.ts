// 에이전트 실행 엔진
// 에이전트 간 협업 및 워크플로우 관리

import { callAI, type AIMessage } from './providers';
import { generateSystemPrompt, generateCollaborationContext, agentPersonas } from './personas';

export interface AgentTask {
  id: string;
  workspaceId: string;
  userId: string;
  agentId: string;
  agentType: string;
  agentName: string;
  input: string;
  context?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CollaborationMessage {
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'notification';
  content: string;
  timestamp: Date;
}

// 에이전트 작업 실행
export async function executeAgentTask(
  task: AgentTask,
  config: {
    provider: 'openai' | 'anthropic' | 'groq';
    apiKey: string;
    model?: string;
    otherAgents?: Array<{ name: string; type: string }>;
    workspaceName?: string;
  }
): Promise<string> {
  const { provider, apiKey, model, otherAgents, workspaceName } = config;

  // 시스템 프롬프트 생성
  const systemPrompt = generateSystemPrompt(task.agentType);
  
  // 협업 컨텍스트 추가
  const collaborationContext = otherAgents && otherAgents.length > 0
    ? generateCollaborationContext(task.agentName, workspaceName || '워크스페이스', otherAgents)
    : '';

  // 메시지 구성
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n${collaborationContext}`,
    },
    {
      role: 'user',
      content: task.input,
    },
  ];

  // 컨텍스트가 있으면 추가
  if (task.context) {
    messages.splice(1, 0, {
      role: 'assistant',
      content: `이전 대화 컨텍스트:\n${task.context}`,
    });
  }

  // AI 호출
  const response = await callAI(messages, provider, {
    apiKey,
    model,
  });

  return response.content;
}

// 에이전트 간 협업 분석
export function analyzeCollaborationNeed(
  agentType: string,
  input: string
): Array<{ agentType: string; reason: string }> {
  const needs: Array<{ agentType: string; reason: string }> = [];
  const inputLower = input.toLowerCase();

  // 키워드 기반 협업 필요성 분석
  const collaborationRules: Record<string, { keywords: string[]; needs: string }> = {
    law: {
      keywords: ['법', '규정', '연차', '휴가', '계약', '해고', '징계'],
      needs: 'schedule',
    },
    schedule: {
      keywords: ['스케줄', '대체', '인력', '일정', '근무'],
      needs: 'law',
    },
    payroll: {
      keywords: ['급여', '연장', '야간', '휴일', '수당', '세금'],
      needs: 'law',
    },
  };

  const currentRules = collaborationRules[agentType];
  if (currentRules) {
    const hasRelevantKeywords = currentRules.keywords.some(keyword => 
      inputLower.includes(keyword)
    );
    
    if (hasRelevantKeywords) {
      // 입력에 다른 에이전트 전문 영역 키워드가 있는지 확인
      Object.entries(collaborationRules).forEach(([type, rules]) => {
        if (type !== agentType) {
          const needsCollaboration = rules.keywords.some(keyword =>
            inputLower.includes(keyword)
          );
          
          if (needsCollaboration) {
            const persona = agentPersonas[type];
            needs.push({
              agentType: type,
              reason: `${persona?.name || type}의 전문 영역이 필요함`,
            });
          }
        }
      });
    }
  }

  return needs;
}

// 멀티 에이전트 협업 실행
export async function executeCollaboration(
  task: AgentTask,
  config: {
    provider: 'openai' | 'anthropic' | 'groq';
    apiKey: string;
    model?: string;
    otherAgents: Array<{ id: string; name: string; type: string }>;
    workspaceName?: string;
    broadcastMessage: (message: any) => void;
  }
): Promise<string> {
  const { provider, apiKey, model, otherAgents, workspaceName, broadcastMessage } = config;

  // 1. 협업 필요성 분석
  const collaborationNeeds = analyzeCollaborationNeed(task.agentType, task.input);

  // 2. 메인 에이전트 실행
  broadcastMessage({
    type: 'agent_thinking',
    agentId: task.agentId,
    agentName: task.agentName,
    content: '작업을 분석하고 있습니다...',
  });

  const mainResult = await executeAgentTask(task, {
    provider,
    apiKey,
    model,
    otherAgents,
    workspaceName,
  });

  // 3. 협업이 필요한 경우
  if (collaborationNeeds.length > 0) {
    broadcastMessage({
      type: 'agent_collaboration',
      agentId: task.agentId,
      agentName: task.agentName,
      content: `${collaborationNeeds[0].reason} - 다른 에이전트와 협업합니다.`,
    });

    // 협업 에이전트 찾기
    const collaborator = otherAgents.find(a => 
      collaborationNeeds.some(need => need.agentType === a.type)
    );

    if (collaborator) {
      // 협업 요청 작업 생성
      const collaborationTask: AgentTask = {
        id: crypto.randomUUID(),
        workspaceId: task.workspaceId,
        userId: task.userId,
        agentId: collaborator.id,
        agentType: collaborator.type,
        agentName: collaborator.name,
        input: `[${task.agentName}의 요청]\n${task.input}\n\n이전 분석 결과:\n${mainResult}`,
        status: 'pending',
        createdAt: new Date(),
      };

      // 협업 에이전트 실행
      const collaborationResult = await executeAgentTask(collaborationTask, {
        provider,
        apiKey,
        model,
        otherAgents,
        workspaceName,
      });

      broadcastMessage({
        type: 'agent_message',
        agentId: collaborator.id,
        agentName: collaborator.name,
        content: collaborationResult,
      });

      // 최종 종합
      const finalTask: AgentTask = {
        ...task,
        input: `사용자 요청: ${task.input}\n\n[${task.agentName}의 분석]\n${mainResult}\n\n[${collaborator.name}의 분석]\n${collaborationResult}\n\n위 분석들을 종합하여 최종 결론을 제시하세요.`,
        context: undefined,
      };

      const finalResult = await executeAgentTask(finalTask, {
        provider,
        apiKey,
        model,
        otherAgents: [],
        workspaceName,
      });

      return finalResult;
    }
  }

  return mainResult;
}
