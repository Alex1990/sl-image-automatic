$(function () {

  function dirname(path, withDilimiter) {
    path = String(path);
    var index = path.lastIndexOf('/');
    return path.slice(0, index + (withDilimiter ? 1 : 0));
  }

  function basename(path, suffix) {
    path = String(path);
    suffix = String(suffix);
    var index = path.lastIndexOf('/');
    var filename = path.slice(index + 1);
    var suffixIndex = filename.indexOf(suffix);
    return filename.slice(0, suffixIndex);
  }

  function extname(path) {
    path = String(path);
    var index = path.lastIndexOf('.');
    return path.slice(index);
  }

  var canvas = $('#canvas')[0];
  var layer = new Layer(canvas);

  var imageList = {
    root: '/imageSource',
    currentFile: null,
    files: [],
    getPath: function () {
      if (this.currentFile) {
        return this.root + '/' + this.currentFile.name;
      } else {
        return null;
      }
    },
    loadFileList: function () {
      var that = this;
      return $.getJSON('/files', function (files) {
        if (files && files.length) {
          that.files = files.map(function (file, index ) {
            file._index = index;
            return file;
          });
          if (!that.currentFile) {
            that.currentFile = that.files[0];
          }
        }
      });
    },
    prev: function () {
      var files = this.files;
      var currentFile = this.currentFile;
      if (files.length && currentFile) {
        if (currentFile._index > 0) {
          currentFile = files[currentFile._index - 1];
        } else {
          currentFile = null;
        }
        this.currentFile = currentFile;
      }
    },
    next: function () {
      var files = this.files;
      var currentFile = this.currentFile;
      if (files.length && currentFile) {
        if (currentFile._index < files.length - 1) {
          currentFile = files[currentFile._index + 1];
        } else {
          currentFile = null;
        }
        this.currentFile = currentFile;
      }
    }
  };

  function loadImage() {
    var src = imageList.getPath();
    if (src) {
      layer.loadImage(src, function (err, image) {
        var $menuForm = $('#menu-form');
        var $buttons = $menuForm.find('button.start, button.save');
        if (err) {
          $buttons.prop('disabled', true);
          throw new Error('Load image error.');
        } else {
          $buttons.prop('disabled', false);
        }
      });
    }
  }

  function setNavbtnState() {
    var $menuForm = $('#menu-form');
    var $prevBtn = $menuForm.find('button.prev');
    var $nextBtn = $menuForm.find('button.next');
    var currentFile = imageList.currentFile;

    if (currentFile._index > 0) {
      $prevBtn.prop('disabled', false);
    } else {
      $prevBtn.prop('disabled', true);
    }

    if (currentFile._index < imageList.files.length - 1) {
      $nextBtn.prop('disabled', false);
    } else {
      $nextBtn.prop('disabled', true);
    }
  }

  function prevImage() {
    imageList.prev();
    setNavbtnState();
    loadImage();
  }

  function nextImage() {
    imageList.next();
    setNavbtnState();
    loadImage();
  }

  function saveImage() {
    layer.canvas.toBlob(function (blob) {
      var filename = imageList.currentFile.name;
      var file = new File([blob], filename);
      var data = new FormData();

      data.append(basename(filename, '.jpg'), file);

      $.ajax({
        url: '/upload',
        type: 'POST',
        data: data,
        cache: false,
        dataType: 'json',
        processData: false,
        contentType: false,
        success: function (res) {
          toastr.success('', 'Save the image successfully.');
        },
        error: function (xhr) {
          toastr.error('', 'Failed in saving the image.');
        }
      });
    }, 'image/jpeg', 1);
  }

  function bindEvents() {
    var $menuForm = $('#menu-form');

    $menuForm
      .on('click', '.prev', prevImage)
      .on('click', '.next', nextImage)
      .on('click', '.start', function () {
        layer.centerAndScale();
      })
      .on('click', '.save', saveImage);
  }

  function init() {
    bindEvents();
    imageList.loadFileList().then(function () {
      var files = imageList.files;
      var currentFile = imageList.currentFile;    
      var $menuForm = $('#menu-form');

      if (currentFile) {
        loadImage();
      }
      if (files.length > 1) {
        $menuForm.find('.next').prop('disabled', false);
      }
    });
  }

  init();

});