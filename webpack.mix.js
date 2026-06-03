const mix = require('laravel-mix')

// Laravel Mix 6 is incompatible with webpack 5.106+ internals:
// - WebpackBarPlugin: ProgressPlugin option validation
// - BuildOutputPlugin: removed webpack/lib/SizeFormatHelpers
// Dropping these only removes fancy CLI output; compilation is unchanged.
mix.override((config) => {
  config.plugins = (config.plugins || []).filter(
    (p) =>
      !p ||
      (p.constructor.name !== 'WebpackBarPlugin' && p.constructor.name !== 'BuildOutputPlugin')
  )
})

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
