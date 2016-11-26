/**
 * `clean`
 *
 * ---------------------------------------------------------------
 *
 * Remove the files and folders in your Sails app's web root
 * (conventionally a hidden directory called `.tmp/public`).
 *
 * For usage docs see:
 *   https://github.com/gruntjs/grunt-contrib-clean
 *
 */
module.exports = function(grunt) {

  grunt.config.set('clean', {
    dev: ['.tmp/public/**'],
    build: ['www'],
    bower: ['.tmp/public/bower_components/**']
  });

  grunt.registerTask('buildProd', [
    'compileAssets',
    'concat',
    'uglify',
    'cssmin',
    'linkAssetsBuildProd',
    'clean:bower',
    'clean:build',
    'copy:build'
  ]);

  grunt.loadNpmTasks('grunt-contrib-clean');
};
