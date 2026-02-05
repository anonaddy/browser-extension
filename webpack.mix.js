const mix = require('laravel-mix')

mix
  .webpackConfig({
    node: {
      global: false,
    },
  })
  .copy('src/app.html', 'dist/')
  .copy('src/manifest.json', 'dist/')
  .copyDirectory('src/assets/img', 'dist/img')
  .js('src/assets/js/app.js', 'dist/')
  .js('src/background.js', 'dist/')
  .js('src/content.js', 'dist/')
  .vue({
    options: {
      compilerOptions: {
        // Ignore our <content> tag in App.vue
        isCustomElement: (tag) => tag === 'content',
      },
    },
  })
  .postCss('src/assets/css/app.css', 'dist/', [require('@tailwindcss/postcss')])
