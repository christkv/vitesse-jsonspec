var assert = require("assert"),
  http = require('http'),
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

      // // Filter out a single test file for now
      // testFiles = testFiles.filter(function(x) { 
      //     // return !(
      //     //   x.indexOf('dependencies.json') != -1
      //     // );

      //   // return x.indexOf('ref.json') != -1
      //   // return x.indexOf('refRemote.json') != -1
      //   return x.indexOf('dependencies.json') != -1
      //   // return x.indexOf('maxProperties.json') != -1
      //   // return x.indexOf('maxLength.json') != -1
      //   // return x.indexOf('refRemote.json') != -1
      //   // return x.indexOf('dependencies.json') != -1
      // });

      // resolve all the files
      testFiles = testFiles.map(function(x) {
        return {
          file: f('%s/%s', directory, x), 
          schemas: JSON.parse(fs.readFileSync(f('%s/%s', directory, x)))
        };
      });

      // No tests
      if(testFiles.length == 0) return done();

      // Start up http server
      bootServer(1234, function() {  
        // console.log("-------------------------------------------- Execute") 
        // Execute the next testFile
        var executeF = function(testFiles, callback) {
          if(testFiles.length == 0) return callback();
          var testFile = testFiles.shift();
          // Execute the test file
          executeTestFile(testFile, function(err) {
            if(err) return callback(err);
            executeF(testFiles, callback);
          });
        }

        executeF(testFiles, done);
      })
    });
  });
});

var executeTestFile = function(obj,  callback) {  
  var schemas = obj.schemas.slice(0);
  console.log(f("\nexecute file [%s]", obj.file));

  // Execute the next test
  var execute = function(schemas, callback) {
    if(schemas.length == 0) return callback();
    var schema = schemas.shift();

    // Execute the test
    executeTest(schema, function(err) {
      if(err) return callback(err);
      execute(schemas, callback);
    });
  }

  // Execute the schema
  execute(schemas, callback);
}

var bootServer = function(port, callback) {
  var servings = {
    '/subSchemas.json': fs.readFileSync(f('%s/suite/remotes/subSchemas.json', __dirname), 'utf8'),
    '/integer.json': fs.readFileSync(f('%s/suite/remotes/integer.json', __dirname), 'utf8'),
    '/folder/folderInteger.json': fs.readFileSync(f('%s/suite/remotes/folder/folderInteger.json', __dirname), 'utf8')
  }

  var server = http.createServer(function (req, res) {
    // console.log("############################## REQUEST " + req.url)
    // console.dir(servings[req.url])

    if(!servings[req.url]) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      return res.end(f('failed to locate resource %s', req.url));
    }

    // Server the document
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(servings[req.url]);
  })

  server.listen(port);

  // Return
  callback();
}

var executeTest = function(obj, callback) {
  // Unpack schema
  var schema = obj.schema;
  var description = obj.description;
  console.log(f('  %s', description))
  var tests = obj.tests;
  // Print out the schema
  console.log(f('running test %s against schema [%s]', description, JSON.stringify(schema)));
  // Execute the tests
  var execute = function(tests, callback) {
    if(tests.length == 0) return callback();
    // Get the next test
    var t = tests.shift();
    // Unpack the tests
    var description = t.description;
    console.log(f('    - %s', description))
    var data = t.data;
    var valid = t.valid;

    // Compiler options
    var opt = {debug:true};
    var opt = {debug:false};

    // Compile schema
    new JSONSchema().compile(schema, opt, function(err, validator) {
      if(err) callback(err);
      var results = validator.validate(data);
      // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
      // console.dir(results)
      // Expected valid validation
      if(valid) {
      // console.dir(results[0].rule)
        assert.equal(0, results.length);
      } else {
        assert.ok(results.length > 0);
      }

      // Execute next test
      execute(tests, callback);
    });
  }

  // Start executing tests
  execute(tests, callback);
}