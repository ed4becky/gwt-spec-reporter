/* global beforeEach, it, describe */

'use strict';
/*
 * Based upon "Function.prototype.bind polyfill for PhantomJS"
 *  author: Tom Watson <tom.james.watson@gmail.com>
 *  homepage: https://github.com/tom-james-watson/phantomjs-polyfill
 *
 *  This fixes a compatibility issue with running Phantom1 with Angular 1.5
 */

/* jshint ignore:start */

// if (typeof Function.prototype.bind != 'function') {
//   Function.prototype.bind = function bind(obj) {
//     var args = Array.prototype.slice.call(arguments, 1),
//       self = this,
//       nop = function() {
//       },
//       bound = function() {
//         return self.apply(
//           this instanceof nop ? this : (obj || {}), args.concat(
//             Array.prototype.slice.call(arguments)
//           )
//         );
//       };
//     nop.prototype = this.prototype || {};
//     bound.prototype = new nop();
//     return bound;
//   };
// }

/* jshint ignore:end */

var rewire = require('rewire');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);
var should = chai.should();
var expect = chai.expect;
var os = require('os');
var reporterRewire = rewire('../index.js');
var GWTReporter = require('../index.js')['reporter:spec'];

var ansiColors = {
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  green: '\u001b[32m',
  reset: '\u001b[39m'
};
var windowsIcons = {
  success: '\u221A ',
  failure: '\u00D7 ',
  skipped: '- '
};

//baseReporterDecorator functions
var formatError = function(a, b) {
  return a + b;
};
function noop() {}
var baseReporterDecorator = function(context) {
  context.renderBrowser = sinon.spy();
  context.writeCommonMsg = sinon.spy();
  context.write = sinon.spy();
};

describe('GWTReporter', function() {
  describe('when initializing', function() {
    describe('and on a windows machine', function() {
      function createGWTReporter(config) {
        config = config || {};
        var processMock = {
          platform: function() {
            return 'win32';
          }
        };
        reporterRewire.__set__({
          'reporter:spec': GWTReporter,
          process: {
            platform: 'win32'
          }
        });
        return new reporterRewire['reporter:spec'][1](
          baseReporterDecorator,
          formatError,
          config
        );
      }

      it('GWTReporter should have icons defined appropriately', function() {
        var newGWTReporter = createGWTReporter();
        newGWTReporter.prefixes.success.should.equal(windowsIcons.success);
        newGWTReporter.prefixes.failure.should.equal(windowsIcons.failure);
        newGWTReporter.prefixes.skipped.should.equal(windowsIcons.skipped);
      });

      function createConfigWithPrefixes(prefixes) {
        return {
          GWTReporter: {
            prefixes: prefixes
          }
        };
      }
      it('GWTReporter should allow overriding success icon only', function() {
        var expected = 'PASS';
        var config = createConfigWithPrefixes({ success: expected });
        var newGWTReporter = createGWTReporter(config);
        newGWTReporter.prefixes.success.should.equal(expected);
        newGWTReporter.prefixes.failure.should.equal(windowsIcons.failure);
        newGWTReporter.prefixes.skipped.should.equal(windowsIcons.skipped);
      });

      it('GWTReporter should allow overriding failure icon only', function() {
        var expected = 'FAIL';
        var config = createConfigWithPrefixes({ failure: expected });
        var newGWTReporter = createGWTReporter(config);
        newGWTReporter.prefixes.success.should.equal(windowsIcons.success);
        newGWTReporter.prefixes.failure.should.equal(expected);
        newGWTReporter.prefixes.skipped.should.equal(windowsIcons.skipped);
      });

      it('GWTReporter should allow overriding skipped icon only', function() {
        var expected = 'SKIPPED';
        var config = createConfigWithPrefixes({ skipped: expected });
        var newGWTReporter = createGWTReporter(config);
        newGWTReporter.prefixes.success.should.equal(windowsIcons.success);
        newGWTReporter.prefixes.failure.should.equal(windowsIcons.failure);
        newGWTReporter.prefixes.skipped.should.equal(expected);
      });

      it('GWTReporter should allow overriding all icons', function() {
        var config = createConfigWithPrefixes({
          skipped: 'Skipped',
          failure: 'Failed',
          success: 'Win!'
        });
        var expected = config.GWTReporter.prefixes;
        var newGWTReporter = createGWTReporter(config);
        newGWTReporter.prefixes.success.should.equal(expected.success);
        newGWTReporter.prefixes.failure.should.equal(expected.failure);
        newGWTReporter.prefixes.skipped.should.equal(expected.skipped);
      });
    });
    describe('and colors are not defined', function() {
      var newGWTReporter;
      var config = {};

      beforeEach(function() {
        newGWTReporter = new GWTReporter[1](
          baseReporterDecorator,
          formatError,
          config
        );
      });

      it('GWTReporter should be defined appropriately', function() {
        GWTReporter[0].should.equal('type');
        newGWTReporter.should.be.a('object');
      });

      it('should set USE_COLORS to false by default', function() {
        newGWTReporter.USE_COLORS.should.equal(false);
      });
    });
    describe('and colors are defined', function() {
      var newGWTReporter;
      var config = {
        colors: true
      };

      beforeEach(function() {
        newGWTReporter = new GWTReporter[1](
          baseReporterDecorator,
          formatError,
          config
        );
      });

      it('GWTReporter should be defined appropriately', function() {
        GWTReporter[0].should.equal('type');
        newGWTReporter.should.be.a('object');
      });

      it('should set USE_COLORS to true', function() {
        newGWTReporter.USE_COLORS.should.equal(true);
      });

      it("should set the BaseReporter function's colors", function() {
        newGWTReporter.SPEC_FAILURE.should.equal(
          ansiColors.red + '%s %s FAILED' + ansiColors.reset + '\n'
        );
        newGWTReporter.SPEC_SLOW.should.equal(
          ansiColors.yellow + '%s SLOW %s: %s' + ansiColors.reset + '\n'
        );
        newGWTReporter.ERROR.should.equal(
          ansiColors.red + '%s ERROR' + ansiColors.reset + '\n'
        );
        newGWTReporter.FINISHED_ERROR.should.equal(
          ansiColors.red + ' ERROR' + ansiColors.reset
        );
        newGWTReporter.FINISHED_SUCCESS.should.equal(
          ansiColors.green + ' SUCCESS' + ansiColors.reset
        );
        newGWTReporter.FINISHED_DISCONNECTED.should.equal(
          ansiColors.red + ' DISCONNECTED' + ansiColors.reset
        );
        newGWTReporter.X_FAILED.should.equal(
          ansiColors.red + ' (%d FAILED)' + ansiColors.reset
        );
        newGWTReporter.TOTAL_SUCCESS.should.equal(
          ansiColors.green + 'TOTAL: %d SUCCESS' + ansiColors.reset + '\n'
        );
        newGWTReporter.TOTAL_FAILED.should.equal(
          ansiColors.red +
            'TOTAL: %d FAILED, %d SUCCESS' +
            ansiColors.reset +
            '\n'
        );
      });
    });

    describe('and there are configurations set for the spec reporter', function() {
      describe('and suppressFailed is truthy', function() {
        var newGWTReporter;
        var config = {};
        beforeEach(function() {
          config.GWTReporter = {
            suppressFailed: true
          };
          newGWTReporter = new GWTReporter[1](
            baseReporterDecorator,
            formatError,
            config
          );
        });

        it('should return nothing for specSkipped', function() {
          expect(newGWTReporter.specFailure()).to.equal();
        });
      });

      describe('and suppressSkipped is truthy', function() {
        var newGWTReporter;
        var config = {};
        beforeEach(function() {
          config.GWTReporter = {
            suppressSkipped: true
          };
          newGWTReporter = new GWTReporter[1](
            baseReporterDecorator,
            formatError,
            config
          );
        });

        it('should return nothing for specSkipped', function() {
          expect(newGWTReporter.specSkipped()).to.equal();
        });
      });

      describe('and suppressPassed is truthy', function() {
        var newGWTReporter;
        var config = {};
        beforeEach(function() {
          config.GWTReporter = {
            suppressPassed: true
          };
          newGWTReporter = new GWTReporter[1](
            baseReporterDecorator,
            formatError,
            config
          );
        });

        it('should return nothing for specSuccess', function() {
          expect(newGWTReporter.specSuccess()).to.equal();
        });
      });

      describe('and suppressErrorSummary is truthy', function() {
        var newGWTReporter;
        var config = {};
        beforeEach(function() {
          config.GWTReporter = {
            suppressErrorSummary: true
          };
          newGWTReporter = new GWTReporter[1](
            baseReporterDecorator,
            formatError,
            config
          );
        });

        it('should set the suppressErrorSummary flag to true', function() {
          newGWTReporter.suppressErrorSummary.should.equal(true);
        });
      });

      describe('and showSpecTiming is truthy', function() {
        var newGWTReporter;
        var config = {};
        beforeEach(function() {
          config.GWTReporter = {
            showSpecTiming: true
          };
          newGWTReporter = new GWTReporter[1](
            baseReporterDecorator,
            formatError,
            config
          );
        });

        it('should set the showSpecTiming flag to true', function() {
          newGWTReporter.showSpecTiming.should.equal(true);
        });
      });
    });
  });

  describe('functionality', function() {
    describe('onRunComplete', function() {
      describe('with no browsers', function() {
        var newGWTReporter;
        var config = {};

        beforeEach(function() {
          newGWTReporter = new GWTReporter[1](
            baseReporterDecorator,
            formatError,
            config
          );

          newGWTReporter.currentSuite.push('suite name');
          newGWTReporter.onRunComplete([], []);
        });

        it('should reset failures and currentSuite arrays', function() {
          newGWTReporter.currentSuite.length.should.equal(0);
          newGWTReporter.failures.length.should.equal(0);
        });

        it('should call writeCommonMsg', function() {
          newGWTReporter.writeCommonMsg.should.have.been.called;
        });

        it('should call write', function() {
          newGWTReporter.write.should.have.been.called;
        });
      });

      describe('with browsers', function() {
        describe('and there are no failures', function() {
          var newGWTReporter;
          var config = {};

          beforeEach(function() {
            newGWTReporter = new GWTReporter[1](
              baseReporterDecorator,
              formatError,
              config
            );
            newGWTReporter.currentSuite.push('suite name');
            newGWTReporter.onRunComplete(['testValue'], {
              disconnected: false,
              error: false,
              failed: 0,
              success: 10
            });
          });

          it('should call to write all of the successful specs', function() {
            newGWTReporter.write.should.have.been.calledWith(undefined, 10);
          });

          it('should reset failures and currentSuite arrays', function() {
            newGWTReporter.currentSuite.length.should.equal(0);
            newGWTReporter.failures.length.should.equal(0);
          });

          it('should call writeCommonMsg', function() {
            newGWTReporter.writeCommonMsg.should.have.been.called;
          });
        });

        describe('and there are failures', function() {
          describe('and suppressErrorSummary is true', function() {
            var newGWTReporter;
            var config = {
              GWTReporter: {
                suppressErrorSummary: true
              }
            };
            beforeEach(function() {
              newGWTReporter = new GWTReporter[1](
                baseReporterDecorator,
                formatError,
                config
              );
              newGWTReporter.logFinalErrors = sinon.spy();
              newGWTReporter.currentSuite.push('suite name');
              newGWTReporter.onRunComplete(['testValue'], {
                disconnected: false,
                error: false,
                failed: 10,
                success: 0
              });
            });

            it('should call to write all of the failed and successful specs', function() {
              newGWTReporter.write.should.have.been.calledWith(
                undefined,
                10,
                0
              );
            });

            it('should reset failures and currentSuite arrays', function() {
              newGWTReporter.currentSuite.length.should.equal(0);
              newGWTReporter.failures.length.should.equal(0);
            });

            it('should call writeCommonMsg', function() {
              newGWTReporter.writeCommonMsg.should.have.been.called;
            });

            it('should not call to log the final errors', function() {
              newGWTReporter.logFinalErrors.should.not.have.been.called;
            });
          });

          describe('and suppressErrorSummary is false', function() {
            var newGWTReporter;
            var config = {};
            beforeEach(function() {
              newGWTReporter = new GWTReporter[1](
                baseReporterDecorator,
                formatError,
                config
              );
              newGWTReporter.logFinalErrors = sinon.spy();
              newGWTReporter.currentSuite.push('suite name');
              newGWTReporter.onRunComplete(['testValue'], {
                disconnected: false,
                error: false,
                failed: 10,
                success: 0
              });
            });

            it('should call to write all of the failed and successful specs', function() {
              newGWTReporter.write.should.have.been.calledWith(
                undefined,
                10,
                0
              );
            });

            it('should reset failures and currentSuite arrays', function() {
              newGWTReporter.currentSuite.length.should.equal(0);
              newGWTReporter.failures.length.should.equal(0);
            });

            it('should call writeCommonMsg', function() {
              newGWTReporter.writeCommonMsg.should.have.been.called;
            });

            it('should call to log the final errors', function() {
              newGWTReporter.logFinalErrors.should.have.been.called;
            });
          });
        });
      });
    });

    describe('logFinalErrors', function() {
      var writtenMessages = [];
      beforeEach(function() {
        writtenMessages = [];
      });
      function passThrough(str) {
        return str;
      }
      function createGWTReporter(options) {
        var result = new GWTReporter[1](
          baseReporterDecorator,
          passThrough,
          options || {}
        );
        result.writeCommonMsg = function(str) {
          writtenMessages.push(str);
        };
        return result;
      }

      it('should write a single failure out', function() {
        var errors = [
          {
            suite: ['A', 'B'],
            description: 'should do stuff',
            log: ['The Error!']
          }
        ];
        var expected = [
          '\n\n',
          '\u001b[31m1) should do stuff\n\u001b[39m',
          '\u001b[31m     A B\n\u001b[39m',
          '     \u001b[90mThe Error!\u001b[39m',
          '\n'
        ];
        var GWTReporter = createGWTReporter();
        GWTReporter.logFinalErrors(errors);
        writtenMessages.should.eql(expected);
      });

      it('should truncate messages exceding maxLogLines in length', function() {
        var errors = [
          {
            suite: ['A', 'B'],
            description: 'should do stuff',
            log: ['The Error!\nThis line should be discarded']
          }
        ];
        var expected = [
          '\n\n',
          '\u001b[31m1) should do stuff\n\u001b[39m',
          '\u001b[31m     A B\n\u001b[39m',
          '     \u001b[90mThe Error!\u001b[39m',
          '\n'
        ];
        var GWTReporter = createGWTReporter({
          GWTReporter: {
            maxLogLines: 1
          }
        });
        GWTReporter.logFinalErrors(errors);
        writtenMessages.should.eql(expected);
      });

      it('should write out multiple failures', function() {
        var errors = [
          {
            suite: ['A', 'B'],
            description: 'should do stuff',
            log: ['The Error!']
          },
          {
            suite: ['C', 'D'],
            description: 'should do more stuff',
            log: ['Another error!']
          }
        ];
        var expected = [
          '\n\n',
          '\u001b[31m1) should do stuff\n\u001b[39m',
          '\u001b[31m     A B\n\u001b[39m',
          '     \u001b[90mThe Error!\u001b[39m',
          '\n',
          '\u001b[31m2) should do more stuff\n\u001b[39m',
          '\u001b[31m     C D\n\u001b[39m',
          '     \u001b[90mAnother error!\u001b[39m',
          '\n'
        ];
        var GWTReporter = createGWTReporter();
        GWTReporter.logFinalErrors(errors);
        writtenMessages.should.eql(expected);
      });
    });

    describe('onSpecFailure', function() {
      describe('with FAIL_FAST option', function() {
        var newGWTReporter;
        var config = {};
        beforeEach(function() {
          config.GWTReporter = {
            failFast: true
          };
          newGWTReporter = new GWTReporter[1](
            baseReporterDecorator,
            formatError,
            config
          );
        });
        it('should throw an error', function() {
          expect(function() {
            newGWTReporter.onSpecFailure([], {
              suite: [],
              log: []
            });
          }).to.throw(Error, /failFast/);
        });
      });
    });
  });
});
