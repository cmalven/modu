export default {
  build: {
    target: 'es2015',
    minify: false,
    lib: {
      entry: 'index.ts',
      name: 'Modu',
      formats: ['es'],
    },
  },
};
