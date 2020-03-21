var colors = require('colors/safe');

var GWTReporter = function(baseReporterDecorator, formatError, config) {
  baseReporterDecorator(this);

  var platform = process ? process.platform : 'unknown';
  var selectPrefix = function(defaultMarker, win32Marker) {
    return platform === 'win32' ? win32Marker : defaultMarker;
  };
  var reporterCfg = config.GWTReporter || {};
  this.prefixes = Object.assign(
    {
      success: selectPrefix('✓ ', '\u221A '),
      failure: selectPrefix('✗ ', '\u00D7 '),
      skipped: selectPrefix('- ', '- ')
    },
    reporterCfg.prefixes
  );

  this.failures = [];
  this.USE_COLORS = false;

  // colorize output of BaseReporter functions
  if (config.colors) {
    colors.enabled = true;
    this.USE_COLORS = true;
    this.SPEC_FAILURE = colors.red('%s %s FAILED') + '\n';
    this.SPEC_SLOW = colors.yellow('%s SLOW %s: %s') + '\n';
    this.ERROR = colors.red('%s ERROR') + '\n';
    this.FINISHED_ERROR = colors.red(' ERROR');
    this.FINISHED_SUCCESS = colors.green(' SUCCESS');
    this.FINISHED_DISCONNECTED = colors.red(' DISCONNECTED');
    this.X_FAILED = colors.red(' (%d FAILED)');
    this.TOTAL_SUCCESS = colors.green('TOTAL: %d SUCCESS') + '\n';
    this.TOTAL_FAILED = colors.red('TOTAL: %d FAILED, %d SUCCESS') + '\n';
  }

  this.onRunComplete = function(browsers, results) {
    //NOTE: the renderBrowser function is defined in karma/reporters/Base.js
    try {
      this.writeCommonMsg(
        '\n' + browsers.map(this.renderBrowser).join('\n') + '\n'
      );

      if (browsers.length >= 1 && !results.disconnected && !results.error) {
        if (!results.failed) {
          this.write(this.TOTAL_SUCCESS, results.success);
        } else {
          this.write(this.TOTAL_FAILED, results.failed, results.success);
          if (!this.suppressErrorSummary) {
            this.logFinalErrors(this.failures);
          }
        }
      }

      this.write('\n');
      this.failures = [];
      this.currentSuite = [];
    } catch (e) {
      console.error(e);
    }
  };

  this.logFinalErrors = function(errors) {
    this.writeCommonMsg('\n\n');
    this.WHITESPACE = '     ';

    errors.forEach(function(failure, index) {
      index = index + 1;
      if (index > 1) {
        this.writeCommonMsg('\n');
      }
      var msg = '';
      var lines = failure.description.split('\n');
      lines.forEach(line => {
        msg += '\n' + line.trim();
      });

      msg += '\n';
      try {
        this.writeCommonMsg(colors.red(index + ') ' + msg + '\n'));
        this.writeCommonMsg(
          this.WHITESPACE + colors.red(failure.suite.join(' ')) + '\n'
        );
        failure.log.forEach(function(log) {
          if (reporterCfg.maxLogLines) {
            log = log
              .split('\n')
              .slice(0, reporterCfg.maxLogLines)
              .join('\n');
          }
          this.writeCommonMsg(
            this.WHITESPACE +
              colors.grey(formatError(log).replace(/\\n/g, '\n')) +
              '\n'
          );
        }, this);
        this.writeCommonMsg('\n');
      } catch (e) {
        console.log.error(e);
      }
    }, this);
  };

  this.currentSuite = [];
  this.writeSpecMessage = function(status) {
    return function(browser, result) {
      var suite = result.suite;
      var indent = '  ';
      suite.forEach(function(value, index) {
        if (
          index >= this.currentSuite.length ||
          this.currentSuite[index] != value
        ) {
          if (index === 0) {
            this.writeCommonMsg('\n');
          }
          this.writeCommonMsg(indent + value + '\n');
          this.currentSuite = [];
        }
        indent += '  ';
      }, this);
      this.currentSuite = suite;
      var elapsedTime = reporterCfg.showSpecTiming
        ? ' (' + result.time + 'ms)'
        : '';

      var msg = '';
      var lines = result.description.split('\n');
      var tmp = status;
      lines.forEach(line => {
        msg += '\n' + indent + tmp + line.trim();
        tmp = '  ';
      });
      if (this.USE_COLORS) {
        if (result.skipped) msg = colors.cyan(msg);
        else if (!result.success) msg = colors.red(msg);
      }
      msg += indent + elapsedTime;

      result.log.forEach(function(log) {
        if (reporterCfg.maxLogLines) {
          log = log
            .split('\n')
            .slice(0, reporterCfg.maxLogLines)
            .join('\n');
        }
        msg += '\n' + formatError(log, '\t');
      });
      this.writeCommonMsg(msg + '\n');
      // NOTE: other useful properties
      // browser.id;
      // browser.fullName;
    }.bind(this);
  };

  this.LOG_SINGLE_BROWSER = '%s LOG: %s\n';
  this.LOG_MULTI_BROWSER = '%s %s LOG: %s\n';
  var doLog =
    config &&
    config.browserConsoleLogOptions &&
    config.browserConsoleLogOptions.terminal;
  this.onBrowserLog = doLog
    ? function(browser, log, type) {
        if (this._browsers && this._browsers.length === 1) {
          this.write(
            this.LOG_SINGLE_BROWSER,
            type.toUpperCase(),
            this.USE_COLORS ? colors.cyan(log) : log
          );
        } else {
          this.write(
            this.LOG_MULTI_BROWSER,
            browser,
            type.toUpperCase(),
            this.USE_COLORS ? colors.cyan(log) : log
          );
        }
      }
    : noop;

  function noop() {}

  this.onSpecFailure = function(browsers, results) {
    this.failures.push(results);
    try {
      this.writeSpecMessage(
        this.USE_COLORS
          ? colors.red(this.prefixes.failure)
          : this.prefixes.failure
      ).apply(this, arguments);
    } catch (e) {
      console.error(e);
    }
    if (reporterCfg.failFast) {
      throw new Error(
        'Fail fast active for tests, exiting(failFast option is enabled)'
      );
    }
  };

  this.specSuccess = reporterCfg.suppressPassed
    ? noop
    : this.writeSpecMessage(
        this.USE_COLORS
          ? colors.green(this.prefixes.success)
          : this.prefixes.success
      );

  this.specSkipped = reporterCfg.suppressSkipped
    ? noop
    : this.writeSpecMessage(
        this.USE_COLORS
          ? colors.cyan(this.prefixes.skipped)
          : this.prefixes.skipped
      );

  this.specFailure = reporterCfg.suppressFailed ? noop : this.onSpecFailure;
  this.suppressErrorSummary = reporterCfg.suppressErrorSummary || false;
  this.showSpecTiming = reporterCfg.showSpecTiming || false;
};

GWTReporter.$inject = ['baseReporterDecorator', 'formatError', 'config'];

module.exports = {
  'reporter:gwt-spec': ['type', GWTReporter]
};
