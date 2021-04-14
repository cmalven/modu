export default {
  build: {
    target: 'es2015',
    minify: false,
    lib: {
      entry: 'index.js',
      formats: ['es'],
    }
  }
}