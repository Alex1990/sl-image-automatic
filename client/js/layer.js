;(function () {

  /* Utility functions
   * =================
  */

  var util = {};

  //name: Hermite resize
  //about: Fast image resize/resample using Hermite filter with JavaScript.
  //author: ViliusL
  //demo: http://viliusle.github.io/miniPaint/
  util.resample_hermite = function (canvas, W, H, W2, H2){
    W2 = Math.round(W2);
    H2 = Math.round(H2);

    var img = canvas.getContext("2d").getImageData(0, 0, W, H);
    var img2 = canvas.getContext("2d").getImageData(0, 0, W2, H2);
    var data = img.data;
    var data2 = img2.data;
    var ratio_w = W / W2;
    var ratio_h = H / H2;
    var ratio_w_half = Math.ceil(ratio_w / 2);
    var ratio_h_half = Math.ceil(ratio_h / 2);
    
    for (var j = 0; j < H2; j++) {
      for (var i = 0; i < W2; i++) {
        var x2 = (i + j * W2) * 4;
        var weight = 0;
        var weights = 0;
        var weights_alpha = 0;
        var gx_r = gx_g = gx_b = gx_a = 0;
        var center_y = (j + 0.5) * ratio_h;

        for (var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++) {
          var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
          var center_x = (i + 0.5) * ratio_w;
          var w0 = dy * dy //pre-calc part of w

          for (var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++) {
            var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
            var w = Math.sqrt(w0 + dx * dx);

            if (w >= -1 && w <= 1) {
              //hermite filter
              weight = 2 * w * w * w - 3 * w * w + 1;

              if (weight > 0) {
                dx = 4*(xx + yy*W);
                //alpha
                gx_a += weight * data[dx + 3];
                weights_alpha += weight;
                //colors
                if (data[dx + 3] < 255) {
                  weight = weight * data[dx + 3] / 250;
                }
                gx_r += weight * data[dx];
                gx_g += weight * data[dx + 1];
                gx_b += weight * data[dx + 2];
                weights += weight;
              }
            }
          }   
        }
        data2[x2] = gx_r / weights;
        data2[x2 + 1] = gx_g / weights;
        data2[x2 + 2] = gx_b / weights;
        data2[x2 + 3] = gx_a / weights_alpha;
      }
    }

    canvas.getContext("2d").clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
    canvas.width = W2;
    canvas.height = H2;
    canvas.getContext("2d").putImageData(img2, 0, 0);
  };

  util.bilinearScale = function (canvas, dw, dh) {
    dw = Math.floor(dw);
    dh = Math.floor(dh);

    var ctx = canvas.getContext('2d');
    var sw = canvas.width;
    var sh = canvas.height;
    var sImg = ctx.getImageData(0, 0, sw, sh);
    var sImgData = sImg.data;
    var xRatio = sw / dw;
    var yRatio = sh / dh;
    var dImg = new ImageData(dw, dh);
    var dImgData = dImg.data;
    var x, y;
    var xDiff, ydiff;
    var sIndex, dIndex;
    var pa, pb, pc, pd;
    var r, g, b, a;

    for (var i = 0; i < dh; i++) {
      for (var j = 0; j < dw; j++) {
        x = Math.floor(j * xRatio);
        y = Math.floor(i * yRatio);
        xDiff = (xRatio * j) - x;
        yDiff = (yRatio * i) - y;
        sIndex = (y * sw + x) * 4;
        dIndex = (i * dw + j) * 4;

        pa = sIndex;
        pb = sIndex + 4;
        pc = sIndex + sw * 4;
        pd = sIndex + sw * 4 + 4;

        r = sImgData[pa] * (1 - xDiff) * (1 - yDiff) + sImgData[pb] * xDiff * (1 - yDiff) +
            sImgData[pc] * yDiff * (1 - xDiff) + sImgData[pd] * xDiff * yDiff;

        g = sImgData[pa + 1] * (1 - xDiff) * (1 - yDiff) + sImgData[pb + 1] * xDiff * (1 - yDiff) +
            sImgData[pc + 1] * yDiff * (1 - xDiff) + sImgData[pd + 1] * xDiff * yDiff;

        b = sImgData[pa + 2] * (1 - xDiff) * (1 - yDiff) + sImgData[pb + 2] * xDiff * (1 - yDiff) +
            sImgData[pc + 2] * yDiff * (1 - xDiff) + sImgData[pd + 2] * xDiff * yDiff;

        a = sImgData[pa + 3] * (1 - xDiff) * (1 - yDiff) + sImgData[pb + 3] * xDiff * (1 - yDiff) +
            sImgData[pc + 3] * yDiff * (1 - xDiff) + sImgData[pd + 3] * xDiff * yDiff;

        r = Math.min(255, r);
        r = Math.max(0, r);
        g = Math.min(255, g);
        g = Math.max(0, g);
        b = Math.min(255, b);
        b = Math.max(0, b);
        a = Math.min(255, a);
        a = Math.max(0, a);

        dImgData[dIndex] = r;
        dImgData[dIndex + 1] = g;
        dImgData[dIndex + 2] = b;
        dImgData[dIndex + 3] = a;
      }
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, sw, sh);
    ctx.putImageData(dImg, (sw - dw) / 2, (sh - dh) / 2);
  };

  util.isSameColor = function (color1, color2, delta) {
    return Math.abs(color1.r - color2.r) <= delta &&
      Math.abs(color1.g - color2.g) <= delta &&
      Math.abs(color1.b - color2.b) <= delta;
  };

  util.pixelToRgb = function (pixels, index) {
    return {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    };
  };

  /* Layer
   * =====
  */

  function Layer(canvas, options) {
    options = options || {};
    var that = this;
    this.options = options;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    if (options.width != null) {
      this.width = canvas.width = options.width;
    }
    if (options.height != null) {
      this.height = canvas.height = options.height;
    }

    if (options.src) {
      this.loadImage(options.src, function (err, img) {
        if (!err) {
          options.onLoadImage && options.onLoadImage.call(that, img);
        }
      });
    }
  }

  Layer.prototype.loadImage = function (src, cb) {
    var that = this;
    var ctx = this.ctx;
    var img = new Image();
    img.src = src;
    img.addEventListener('load', function () {
      that.width = that.canvas.width = img.width;
      that.height = that.canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      cb(null, img);
    }, false);
    img.addEventListener('error', function (event) {
      cb('Load image failed');
    });
  };

  Layer.prototype.move = function (x, y) {
    var tmpCanvas = document.createElement('canvas');
    var tmpCtx = tmpCanvas.getContext('2d');
    var w = this.canvas.width;
    var h = this.canvas.height;

    tmpCanvas.width = w;
    tmpCanvas.height = h;

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.drawImage(canvas, 0, 0, w, h);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tmpCanvas, x, y, w, h);
  };

  Layer.prototype.scale = function(rx, ry) {
    var w = this.canvas.width;
    var h = this.canvas.height;
    var dw = w * rx;
    var dh = h * ry;

    util.bilinearScale(this.canvas, dw, dh);
  };

  Layer.prototype.resample = function(rx, ry) {
    if (rx == null) return;
    if (ry == null) ry = rx;

    var w = this.canvas.width;
    var h = this.canvas.height;
    var dw =  Math.round(w / rx);
    var dh =  Math.round(h / ry);

    if (rx > 1 && ry > 1 && dw >= 500 && dh >= 500) {
      var sx = (w - dw) / 2;
      var sy = (h - dh) / 2;

      var tmpCanvas = document.createElement('canvas');
      var tmpCtx = tmpCanvas.getContext('2d');

      tmpCanvas.width = w;
      tmpCanvas.height = h;

      tmpCtx.drawImage(this.canvas, 0, 0);

      this.canvas.width = dw;
      this.canvas.height = dh;

      this.ctx.drawImage(tmpCanvas, sx, sy, dw, dh, 0, 0, dw, dh);
    } else {
      this.scale(rx, ry);
    }
  };

  Layer.prototype.imageRect = function () {
    var w = this.width;
    var h = this.height;
    var cols = w;
    var rows = h;
    var imageData = this.ctx.getImageData(0, 0, cols, rows);
    var data = imageData.data;
    var rect = {
      width: w,
      height: h,
      top: 0,
      right: h - 1,
      bottom: w - 1,
      left: 0,
      cx: w / 2,
      cy: h / 2
    };

    var isBreak = false;

    for (var row = 0; row < rows; row++) {
      var lastColor;

      for (var col = 0; col < cols; col++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (col === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.top = row;
          break;
        }
      }

      if (isBreak) break;
    }

    isBreak = false;

    for (var row = rows - 1; row >= 0; row--) {
      var lastColor;

      for (var col = 0; col < cols; col++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (col === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.bottom = row;
          break;
        }
      }

      if (isBreak) break;
    }

    isBreak = false;

    for (var col = 0; col < cols; col++) {
      var lastColor;

      for (var row = 0; row < rows; row++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (row === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.left = col;
          break;
        }
      }

      if (isBreak) break;
    }

    isBreak = false;

    for (var col = cols - 1; col >= 0; col--) {
      var lastColor;

      for (var row = 0; row < rows; row++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (row === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.right = col;
          break;
        }
      }

      if (isBreak) break;
    }

    rect.width = rect.right - rect.left;
    rect.height = rect.bottom - rect.top;
    rect.cx = rect.width / 2 + rect.left;
    rect.cy = rect.height / 2 + rect.top;

    return rect;
  };

  Layer.prototype.centerAndScale = function () {
    var minFactor = 0.65;
    var centerPoint = {
      x: this.width / 2,
      y: this.height / 2
    };
    var imgRect = this.imageRect();

    this.move(centerPoint.x - imgRect.cx, centerPoint.y - imgRect.cy);

    var ratio;
    var actualRatio;

    if (imgRect.width > imgRect.height) {
      ratio = imgRect.width / imgRect.height;
      actualRatio = imgRect.width / this.width;
    } else if (imgRect.width < imgRect.height) {
      ratio = imgRect.height / imgRect.width;
      actualRatio = imgRect.height / this.height;
    } else {
      ratio = 1;
      actualRatio = imgRect.width / this.width;
    }

    ratio = Math.min(ratio, 4);

    var expectRatio = minFactor + Math.pow(ratio - 1, 1/3) * 0.09;
    var factor = expectRatio / actualRatio;

    this.resample(factor);
  };

  window.Layer = Layer;

})();