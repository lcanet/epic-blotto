module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Configurable paths for the application
    var appConfig = {
        app: 'web',
        dist: 'webdist'
    };

    // Project configuration.
    grunt.initConfig({
        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        'webdist/{,*/}*'
                    ]
                }]
            }
        },

        // Renames files for browser caching purposes
        filerev: {
            dist: {
                src: [
                    'webdist/js/{,*/}*.js',
                    'webdist/css/{,*/}*.css',
                    'webdist/fonts/*'
                ]
            }
        },

        // Reads HTML for usemin blocks to enable smart builds that automatically
        // concat, minify and revision files. Creates configurations in memory so
        // additional tasks can operate on them
        useminPrepare: {
            html: 'web/index.html',
            options: {
                dest: 'webdist',
                flow: {
                    html: {
                        steps: {
                            js: ['concat', 'uglifyjs'],
                            css: ['cssmin']
                        },
                        post: {}
                    }
                }
            }
        },

        // Performs rewrites based on filerev and the useminPrepare configuration
        usemin: {
            html: ['webdist/{,*/}*.html'],
            css: ['webdist/css/{,*/}*.css'],
            options: {
                assetsDirs: ['webdist','webdist/images']
            }
        },

        htmlmin: {
            dist: {
                options: {
                    collapseWhitespace: true,
                    conservativeCollapse: true,
                    collapseBooleanAttributes: true,
                    removeCommentsFromCDATA: true,
                    removeOptionalTags: true
                },
                files: [{
                    expand: true,
                    cwd: 'webdist',
                    src: ['*.html', 'views/{,*/}*.html'],
                    dest: 'webdist'
                }]
            }
        },

        // ng-annotate tries to make the code safe for minification automatically
        // by using the Angular long form for dependency injection.
        ngAnnotate: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '.tmp/concat/js',
                    src: ['*.js', '!oldieshim.js'],
                    dest: '.tmp/concat/js'
                }]
            }
        },

        // Copies remaining files to places other tasks can use
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: 'web',
                        dest: 'webdist',
                        src: [
                            '*.{ico,png,txt}',
                            '.htaccess',
                            '*.html',
                            'views/{,*/}*.html',
                            'images/{,*/}*.*',
                            'fonts/{,*/}*.*'
                        ]
                    },
                    {
//for font-awesome
                        expand: true,
                        dot: true,
                        cwd: 'web/libs/font-awesome',
                        src: ['fonts/*.*'],
                        dest: 'webdist'
                    },
                    {
// leaflet-fa
                        expand: true,
                        dot: true,
                        cwd: 'web/libs/Leaflet.awesome-markers/dist',
                        src: ['images/*.*'],
                        dest: 'webdist/css'
                    }

                ]
            },
            styles: {
                expand: true,
                cwd: 'web/css',
                dest: '.tmp/css/',
                src: '{,*/}*.css'
            }
        }

    });

    // Default task(s).

    grunt.registerTask('webbuild', [
        'clean:dist',
        'useminPrepare',
        'copy:styles',
        'concat',
        'ngAnnotate',
        'copy:dist',
        'cssmin',
        'uglify',
        'filerev',
        'usemin',
        'htmlmin'
    ]);

    grunt.registerTask('default', ['webbuild']);

};