module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',
      builderOptions: {
        appId: 'jp.core-note.${name}',
        fileAssociations: [
          {
            ext: ['mp4', 'mov', 'insv'],
            name: 'Movie',
            role: 'Viewer'
          }
        ],
        mac: {
          category: 'public.app-category.video',
          target: 'dir',
          extendInfo: {
            CFBundlePackageType: 'APPL',
            CFBundleDocumentTypes: [
              {
                CFBundleTypeRole: 'Viewer',
                LSHandlerRank: 'Default',
                LSItemContentTypes: [
                  'public.mp4',
                  'public.mpg',
                  'public.mov',
                  'public.insv'
                ]
              }
            ]
          }
        }
      }
    }
  }
};
