var gulp       = require('gulp');
var util       = require('gulp-util');
var connect    = require('gulp-connect');
var browserify = require('browserify');
var reactify   = require('reactify');
var source     = require('vinyl-source-stream');

function errorHandler (err) {
  util.log(util.colors.red('Error'), err.message);
  this.end();
}

gulp.task('connect', function() {
  connect.server({
    root: 'public',
    livereload: true
  });
});

gulp.task('reload', function () {
  gulp.src('./public/**/*.*')
      .pipe(connect.reload());
});

gulp.task('build', function() {
  browserify({
    entries: [ './jsx/app.jsx' ],
    transform: [reactify]
  })
      .bundle()
      .on('error', errorHandler)
      .pipe(source('app.js'))
      .pipe(gulp.dest('./public/js'));
});

gulp.task('watch', function () {
  gulp.watch(['./jsx/**/*.jsx'], ['build']);
  gulp.watch(['./public/**/*.*'], ['reload']);
});

gulp.task('default', ['connect', 'watch']);
