const path = require('path');
const base = require('./webpack.config');
module.exports = {...base, entry: ['./src/tms_host.tsx'], externals: {}, output: {...base.output, filename: 'tms-host.js', path: path.join(__dirname, 'dist')}};
