export default {
  build: {
    target: 'es2015',
    sourcemap: true,
    lib: {
      entry: 'index.js',
      formats: ['es'],
    }
  }
}