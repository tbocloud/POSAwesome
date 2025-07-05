module.exports = function frappeVueStyle() {
  return {
    name: 'frappe-vue-style',
    setup(build) {
      build.onLoad({ filter: /\.vue$/ }, async (args) => {
        const fs = require('fs');
        const contents = await fs.promises.readFile(args.path, 'utf8');
        const styleMatch = contents.match(/<style[^>]*>([\s\S]*?)<\/style>/);
        if (styleMatch) {
          const stylePath = args.path + '.css';
          await fs.promises.writeFile(stylePath, styleMatch[1]);
          return { contents, loader: 'vue' };
        }
        return { contents, loader: 'vue' };
      });
    }
  };
};
