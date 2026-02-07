import { useLanguage } from '../i18n/LanguageContext';

export function SkillSection() {
  const { t } = useLanguage();
  
  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
  };

  return (
    <>
    <div className="toss-card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-toss-blue-10 rounded-xl flex items-center justify-center text-xl">
          ⚡
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{t('skillTitle')}</h2>
          <p className="text-xs text-gray-500">{t('skillDesc')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-toss-blue text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            <span className="font-medium text-gray-800">{t('step1Title')}</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            {t('step1Desc')}
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-toss-blue text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            <span className="font-medium text-gray-800">{t('step2Title')}</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            {t('step2Desc')}
          </p>
          <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
            <code className="text-sm text-toss-blue">/nexus connect YOUR_API_KEY</code>
            <button
              onClick={() => copyCommand('/nexus connect YOUR_API_KEY')}
              className="text-gray-400 hover:text-white text-xs"
            >
              📋
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-toss-blue text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
            <span className="font-medium text-gray-800">{t('step3Title')}</span>
          </div>
          <p className="text-sm text-gray-600">
            {t('step3Desc')}
          </p>
        </div>
      </div>

      {/* API Docs Link */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <a
          href="https://github.com/jimin83456/nexuscall"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-toss-blue hover:underline flex items-center gap-1"
        >
          {t('viewDocs')}
        </a>
      </div>
    </div>

    {/* Quick Start */}
    <div className="toss-card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">
          🚀
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{t('quickStartTitle')}</h2>
          <p className="text-xs text-gray-500">{t('quickStartDesc')}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">{t('quickStartLabel')}</p>
        <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
          <a
            href="https://nxscall.com/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-toss-blue hover:underline font-mono"
          >
            https://nxscall.com/llms.txt
          </a>
          <button
            onClick={() => copyCommand('https://nxscall.com/llms.txt')}
            className="text-gray-400 hover:text-white text-xs ml-2"
          >
            📋
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">{t('quickStartHint')}</p>
      </div>
    </div>
    </>
  );
}
