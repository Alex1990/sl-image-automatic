var _ = require('lodash');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var util = require('util');
var yaml = require('js-yaml');
var express = require('express');
var serveStatic = require('serve-static');
var formidable = require('formidable');

var app = express();
var cwd = process.cwd();

var defaults = {
  imgSrc: 'imgSrc',
  imgDest: 'imgDest'
};
var configFilePath = path.join(cwd, '_config.yml');
var config;

try {
  fs.accessSync(configFilePath, fs.R_OK);
  config = yaml.safeLoad(fs.readFileSync('_config.yml'), 'utf8');
} catch (e) {
  config = {};
}

var PORT = Number(config.port) || 9000;
var imgSrc = path.join(cwd, config.imgSrc || defaults.imgSrc);
var imgDest = path.join(cwd, config.imgDest || defaults.imgDest);

app.use(serveStatic(__dirname, {'index': ['index.html', 'index.htm']}));
app.use(serveStatic(cwd));

app.get('/image/*', function (req, res, next) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/files', function (req, res, next) {
  fse.ensureDir(imgSrc, function (err) {
    if (err) {
      console.error(err);
    } else {
      fs.readdir(imgSrc, function (err, files) {
        if (err) {
          res.status(404).end();
        } else {
          var data = _.chain(files)
            .map(function (file) {
              return {
                name: file
              };
            })
            .filter(function (file) {
              return path.extname(file.name) === '.jpg';
            })
            .value();

          res.json(data);
        }
      });
    }
  });
});

app.post('/upload', function (req, res, next) {
  var form = new formidable.IncomingForm();

  fse.ensureDir(imgDest, function (err) {
    if (err) {
      console.error(err);
    } else {
      form.uploadDir = imgDest;
      form.keepExtensions = true;
      form.type = 'multipart';

      form.parse(req, function (err, fields, files) {
        res.status(200).json({ fields: fields, files: files });
        _.forEach(files, function (file, key) {
          var newPath = path.join(path.dirname(file.path), file.name);
          fse.move(file.path, newPath, { clobber: true }, function (err) {
            if (err) {
              console.error(err);
            }
          });
        });
      });
    }
  });
});

app.get('/clearImgSrc', function (req, res) {
  fse.emptyDir(imgSrc, function (err) {
    if (err) {
      console.error(err);
      res.status(404).end();
    } else {
      res.status(200).end();
    }
  });
});

app.listen(PORT, function () {
  console.log('127.0.0.1:%d', PORT);
});
