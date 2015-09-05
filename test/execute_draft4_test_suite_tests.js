var assert = require("assert"),
  JSONSchema = require('../lib/json_schema'),
  fs = require('fs'),
  f = require('util').format;

describe('Draft4', function() {
  describe('validation', function() {
    it('should correctly execute Draft4 tests', function(done) {
      this.timeout(90000);
      var directory = f('%s/suite/tests/draft4', __dirname);
      // Read in all the test files
      var testFiles = fs.readdirSync(directory)
        .filter(function(x) {
          return x.indexOf('.json') != -1;
        });

      // Filter out a single test file for now
      testFiles = testFiles.filter(function(x) { 
        return !(x.indexOf('definitions.json') != -1
          || x.indexOf('dependencies.json') != -1
          || x.indexOf('refRemote.json') != -1
          || x.indexOf('ref.json') != -1
        );

        // return x.indexOf('ref.json') != -1
        return x.indexOf('pattern.json') != -1
      });

      // resolve all the files
      testFiles = testFiles.map(function(x) {
        return {
          file: f('%s/%s', directory, x), 
          schemas: JSON.parse(fs.readFileSync(f('%s/%s', directory, x)))
        };
      });

      // No tests
      if(testFiles.length == 0) return done();

      // Total tests left
      var left = testFiles.length;

      // Execute all the test files
      for(var i = 0; i < testFiles.length; i++) {
        executeTestFile(testFiles[i], function(err) {
          left = left - 1;

          if(left == 0) {
            done();
          }
        });
      }
    });
  });
});

var executeTestFile = function(obj,  callback) {  
  var schemas = obj.schemas;
  var left = schemas.length;
  console.log(f("\nexecute file [%s]", obj.file));

  for(var i = 0; i < schemas.length; i++) {
    executeTest(schemas[i], function(err) {
      left = left - 1;

      if(left == 0) callback();
    });
  }
}

var executeTest = function(obj, callback) {
  var left = obj.tests;
  // Unpack schema
  var schema = obj.schema;
  var description = obj.description;
  var tests = obj.tests;
  // Print out the schema
  console.log(f('running test %s against schema [%s]', description, JSON.stringify(schema)));

  // Number of tests left
  var left = tests.length;

  // Run all the tests
  for(var i = 0; i < tests.length; i++) {
    var description = tests[i].description;
    var data = tests[i].data;
    var valid = tests[i].valid;

    console.log(f('  - %s', description));
    // console.log("####################################################### 1")

    var opt = {debug:true};
    var opt = {debug:false};
    // Compile schema
    new JSONSchema().compile(schema, opt, function(err, validator) {
      // console.log("####################################################### 2")
      var results = validator.validate(data);
      // console.dir(results)
      if(valid) {
        assert.equal(0, results.length);
      } else {
        assert.ok(results.length > 0);
      }
      // console.log("data = " + JSON.stringify(data))
      // console.log("valid = " + valid);

      // console.dir(results)
      // console.dir(validator)
      left = left - 1;

      if(left == 0) {
        callback();
      }
    });
  }
}