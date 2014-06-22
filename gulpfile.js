var gulp = require('gulp')
var gutil = require('gulp-util')
var fs = require('fs')
var es = require('event-stream')
var browserify = require('browserify')
var map = require('vinyl-map')
var source = require('vinyl-source-stream')
var buffer = require('gulp-buffer')
var concat = require('gulp-concat')
var path = require('path')

var LIBS = ["react", "jquery", "underscore", "backbone"]
var DIR = 'tests'
var BUILD = 'build'

var gulpBrowserify = function(options, bundleOptions, commands) {
  var b
  options.extensions || (options.extensions = ['.js'])
  bundleOptions || (bundleOptions = {})
  b = browserify(options)

  for ( cmd in commands ) {
    values = commands[cmd]
    if ( typeof values === 'string' ) values = [values]
    values.forEach(function(value) {
      b[cmd](value)
    })
  }
  return b.bundle(bundleOptions)
}

var lib = function() {
  gutil.log('Building libs')
  return gulpBrowserify({
    noParse: ['jquery','underscore','backbone']
  },{},{
    require: LIBS
  }).pipe(source())
    .pipe(buffer())
    .pipe(concat('lib.js'))
    .pipe(gulp.dest(path.join(DIR, BUILD)))
}

var build = function(files) {
  var tasks = []
  //var links = []
  console.log('Building test files: '+files)
  files.forEach(function(name) {
    var src = path.join(__dirname, DIR, name)
    var dst = name.replace(/\.js/,'.html')
    //links.push('<a href="/'+DIR+'/'+dst+'">'+name+'</a>')
    tasks.push(
      gulpBrowserify({
        entries: src
      },{
        debug: true
      },{
        external: LIBS,
        transform: ['reactify']
      })
      .on('error', function(trace) {
        console.error(trace)
        fs.writeFileSync(DIR+'/'+dst, trace)
      })
      .pipe(source())
      .pipe(buffer())
      .pipe(map(function(data, file) {
        var script = data.toString()
        return '<html><head><title>Test for '+name+'</title><script src="lib.js"></script></head>'+
               '<body><script>'+script+'</script></body></html>'
      }))
      .pipe(concat(dst))
      .pipe(gulp.dest(path.join(DIR, BUILD)))
    )
  })
  //fs.writeFileSync(DIR+'/index.html', links.join('<br>'))
  return es.concat.apply(this, tasks)
}

var dispatch = function(file) {
  if ( file )
    return build([file])
  var files = []
  fs.readdir(DIR, function(err, list) {
    list.forEach(function(name) {
      if(/\.js$/.test(name))
        files.push(name)
    })
    build(files)
  })
}

gulp.task('test', function() {
  var handler = function(event) {
    var file = path.basename(event.path)
    gutil.log('File '+file+' was '+event.type+', running tasks...')
    dispatch(file)
  }
  gulp.watch( DIR+'/*.js', handler )
  gulp.watch( 'components/*.js', handler )
  gulp.watch( '/*.js', handler )
  dispatch()
  lib()
  gutil.log('Tests listening for changes')
})