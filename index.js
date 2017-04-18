const fs = require('fs');
const path = require('path');

const loaderUtils = require('loader-utils');
// const webpack = require('webpack');
const MT = require('mark-twain');
const R = require('ramda');
const ejs = require('ejs');

const isCode = R.compose(R.contains(R.__, ['js', 'vue', 'javascript']), R.path(['props', 'lang']));
const isStyle = R.whereEq({ type: 'code', props: { lang: 'css' } });
const isHtml = R.whereEq({ type: 'code', props: { lang: 'html' } });
const getChildren = R.compose(R.prop('children'), R.defaultTo({}));

const util = require('atool-doc-util');

function calculateHtmlPath(cwd, source) {
  const selfPath = path.relative(cwd, source);
  return path.join(path.dirname(selfPath), `${path.basename(selfPath, path.extname(selfPath))}.html`);
}

function calculateDemoHtmlPath(cwd, source) {
  const selfPath = path.relative(cwd, source);
  return path.join(path.dirname(selfPath), `${path.basename(selfPath, path.extname(selfPath))}-demo.html`);
}

module.exports = function(content) {
  this.cacheable && this.cacheable();
  const options = loaderUtils.getOptions(this) || {};
  const resourcePath = this.resourcePath;
  const resource = new util.Resource(options.cwd, options.demoSource, resourcePath);

  const fileContentTree = MT(content).content;
  const meta = MT(content).meta;
  const code = getChildren(fileContentTree.find(isCode)) || '';
  const style = getChildren(fileContentTree.find(isStyle));
  const html = getChildren(fileContentTree.find(isHtml));
  const tpl = options.template;
  const demoTpl = tpl.replace(/.ejs$/,'-demo.ejs')
  this.addDependency(tpl);
  this.addDependency(demoTpl);

  const scripts = [
    path.relative(resourcePath, path.join(resource.demoPath, 'common.js')),
    `${resource.name}.js`,
  ];

  var relativePath = path.relative(resourcePath, path.join('./', options.publicPath))
  relativePath = relativePath.replace(/\\/g,"/")
  const docHtml = ejs.render(fs.readFileSync(tpl, 'utf-8'), {
    file: {
      meta: meta,
      title: meta.title || resource.relativeToCwd + resource.ext,
      resource: resource,
      duoshuoName: options.duoshuoName,
      relativePath,
      demoPath: './' + resource.name + '-demo.html',
      script: scripts,
      html: html,
      style: style,
      desc: util.marked(fileContentTree)
    }
  });

  const demoHtml = ejs.render(fs.readFileSync(demoTpl, 'utf-8'), {
    file: {
      category: meta.category,
      title: meta.title || resource.relativeToCwd + resource.ext,
      resource: resource,
      relativePath,
      script: scripts,
      html: html,
      style: style
    },
  });

  this.emitFile(calculateHtmlPath(options.cwd, resourcePath), docHtml);
  this.emitFile(calculateDemoHtmlPath(options.cwd, resourcePath), demoHtml);
 
  return code;
}
