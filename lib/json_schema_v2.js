"use strict";

var f = require('util').format,
  url = require('url'),
  request = require('request');

// Compilers
var Compiler = require('vitesse').CompilerV2;

// AST classes
var ObjectNode = require('vitesse').ObjectNode,
  StringNode = require('vitesse').StringNode,
  NumberNode = require('vitesse').NumberNode,
  ArrayNode = require('vitesse').ArrayNode,
  IntegerNode = require('vitesse').IntegerNode,
  AnyNode = require('vitesse').AnyNode,
  BooleanNode = require('vitesse').BooleanNode,
  OneOfNode = require('vitesse').OneOfNode,
  AllOfNode = require('vitesse').AllOfNode,
  AnyOfNode = require('vitesse').AnyOfNode,
  NotNode = require('vitesse').NotNode,
  EnumNode = require('vitesse').EnumNode,
  NullNode = require('vitesse').NullNode,
  RecursiveNode = require('vitesse').RecursiveNode;

  var deref2 = require('json-schema-deref');

var clone = function(o) { var ob = {}; for(var n in o) ob[n] = o[n]; return ob; }

var JSONSchema = function() {  
}

JSONSchema.prototype.compile = function(schema, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  options = clone(options);
  // Set recursive resolution depth
  options.maxRecursiveDepth = options.maxRecursiveDepth || 1;
  
  // Clone the schema
  schema = JSON.parse(JSON.stringify(schema));
  
  // Closure compiler
  var closure = typeof options.closure == 'boolean' ? options.closure : false;
  
  // Compile state
  var state = new CompileState(schema, options);
  
  // Build the target schema
  state.buildAST(schema, function(err, ast) {
    if(err) return callback(err);
    // Set the AST
    state.ast = ast;
    // Compile the AST
    var compiler = new Compiler();
    var validator = compiler.compile(ast, options);
    callback(null, validator);
  });
}

//
// Compiler state
//-------------------------------------------------------------------
var CompileState = function(schema, options) {
  this.schema = schema;
  this.options = options || {};
}

CompileState.prototype.buildAST = function(schema, callback) {
  var self = this;
  // var definitions = {};
  
  // Explode the schema
  this.schema = explode(schema, clone(this.options), function(err, schema) {
    // console.log("-------------------------------------------------------- exploded schema")
    // console.log(JSON.stringify(schema, null, 2))
    if(err) return callback(err);    
    // console.log("=================================== extracted definitions")
    // console.log(JSON.stringify(schema, null, 2))
    // process.exit(0)
    // Extract definitions
    // extractDefinitions(schema, definitions);
    // console.log("------------------------------------------ extractDefinitions")
    // console.dir(definitions)
    // Translate the schema
    var result = mapFields(self, null, null, schema);
    callback(null, result);
  });
}

// Expand the schema
var extractDefinitions = function(schema, definitions) {
  for(var name in schema) {
    // Do we have definitions
    if(schema.definitions) {
      for(var name in schema.definitions) {
        definitions[name] = schema.definitions[name]
      }
    }

    // Keep iterating through the schema
    if(schema[name] instanceof Object) {
      extractDefinitions(schema[name], definitions);      
    } else if(Array.isArray(schema[name])) {
      for(var i = 0; i < schema[name].length; i++) {
        extractDefinitions(schema[name][i], definitions);
      }
    }
  }
}

var mapFields = function(self, parent, field, x) {
  var validation = null;

  if(x['$ref']) {
    validation = new RecursiveNode(parent, field, {callpath: x['$ref']});
  }

  // Not
  // ----------------------------------
  if(x.not) {
    validation = validation || new NotNode(parent, field, {});
    validation.addValidations([mapFields(self, validation, field, x.not)]);
  } 

  // OneOf
  // ----------------------------------
  if(x.oneOf) {
    validation = validation || new OneOfNode(parent, field, {});
    // Map all the validations
    var items = x.oneOf.map(function(v) {
      // Merge any other fields on x into the validation
      v = clone(v);
      for(var name in x) {
        if(name != 'oneOf') v[name] = x[name];
      }

      return mapFields(self, validation, field, v);
    }).filter(function(x) {
      return x != null;
    });
    // Set the validations
    validation.addValidations(items);
  }

  // AnyOf
  // ----------------------------------
  if(x.anyOf) {
    validation = validation || new AnyOfNode(parent, field, {});
    // Map all the validations
    var items = x.anyOf.map(function(v) {
      // Merge any other fields on x into the validation
      v = clone(v);
      for(var name in x) {
        if(name != 'anyOf') v[name] = x[name];
      }

      return mapFields(self, validation, field, v);
    }).filter(function(x) {
      return x != null;
    });
    // Set the validations
    validation.addValidations(items);
  }

  // AllOf
  // ----------------------------------
  if(x.allOf) {
    validation = validation || new AllOfNode(parent, field, {});
    // Copy list of items
    var items = x.allOf.slice(0);

    // If we have a base schema add it
    if(Object.keys(x).length > 1) {
      var base = {};
      // Add all base schema values
      for(var name in x) {
        // console.log(name)
        if(name != 'allOf') {
          base[name] = x[name];
        }
      }

      // console.dir(base)
      // Add the base to the items
      items.push(base);
    }

    // Map all the validations
    items = items.map(function(v) {
      return mapFields(self, validation, field, v);
    }).filter(function(x) {
      return x != null;
    });

    // Set the validations
    validation.addValidations(items);
    // Done
    return validation;
  }

  // Multiple types
  // ----------------------------------
  if(Array.isArray(x.type)) {
    // Generate objects for the schemas
    var validations = [];
    var types = x.type.slice(0);

    // Iterate over all the types
    for(var i = 0; i < x.type.length; i++) {
      var object = clone(x);
      object.type = x.type[i];
      validations.push(object);
    }

    // Create the type
    validation = new OneOfNode(parent, field, {});
    validation.addValidations(validations.map(function(v) {
      return mapFields(self, validation, field, v);
    }).filter(function(x) {
      return x != null;
    }));
  }

  // String
  // ----------------------------------  
  if(x.type == 'string') {
    validation = validation || new StringNode(parent, field, {typeCheck:true});
  }

  if(typeof x.maxLength == 'number') {
    validation = validation || new StringNode(parent, field, {});
    validation.addValidation({$lte: x.maxLength});
  }

  if(typeof x.minLength == 'number') {
    validation = validation || new StringNode(parent, field, {});
    validation.addValidation({$gte: x.minLength});
  }

  // Pattern
  // ----------------------------------
  if(x.pattern) {
    validation = validation || new StringNode(parent, field, {});
    validation.addValidation({$regexp: x.pattern});
  } 

  // Object
  // ----------------------------------  
  if(x.type == 'object') {
    validation = validation || new ObjectNode(parent, field, {typeCheck:true});
  }

  if(typeof x.maxProperties == 'number') {
    validation = validation || new ObjectNode(parent, field, {});
    validation.addValidation({$lte: x.maxProperties});
  }

  if(typeof x.minProperties == 'number') {
    validation = validation || new ObjectNode(parent, field, {});
    validation.addValidation({$gte: x.minProperties});
  }

  if(x.patternProperties) {
    validation = validation || new ObjectNode(parent, field, {});
    var patterns = {}

    for(var name in x.patternProperties) {
      patterns[name] = mapFields(self, validation, field, x.patternProperties[name]);
    }

    validation.addPatternPropertiesValidator(patterns);
  }

  if(x.properties) {
    validation = validation || new ObjectNode(parent, field, {});
    
    // Prohibited fields
    var prohibited = [];
    
    // Iterate over all the fields
    for(var name in x.properties) {
      // Check if the properties contains an empty not field, signifying the
      // field should not be included
      if(x.properties[name].not && Object.keys(x.properties[name].not).length == 0) {
        prohibited.push(name);
        continue;
      }

      validation.addChild(name, mapFields(self, validation, name, x.properties[name]));
    }

    // Prohibited fields
    if(prohibited.length > 0) {
      validation.prohibitedFields(prohibited);
    }
  }

  if(x.additionalProperties != null) {
    validation = validation || new ObjectNode(parent, field, {});
    if(typeof x.additionalProperties == 'boolean') {
      validation.addAdditionalPropertiesValidator(x.additionalProperties);       
    } else {
      validation.addAdditionalPropertiesValidator(mapFields(self, validation, field, x.additionalProperties));      
    }
  }

  if(x.required) {
    validation = validation || new ObjectNode(parent, field, {});
    // Required parameters
    var required = x.required.slice(0);
    // Merge required from parent if any
    if(parent && parent.required) {
      required = required.concat(parent.required);
    }

    // Set the parameters
    validation.requiredFields(required);
  }

  if(x.dependencies) {
    validation = validation || new ObjectNode(parent, field, {});
    // Go over all the dependencies
    for(var name in x.dependencies) {
      var dep = x.dependencies[name];

      if(Array.isArray(dep)) {
        validation.addDependency(name, 'array', dep);
      } else {
        validation.addDependency(name, 'schema', mapFields(self, validation, name, dep));
      }
    }    
  }

  // Boolean
  // ----------------------------------  
  if(x.type == 'boolean') {
    validation = validation || new BooleanNode(parent, field, {typeCheck:true});
  }

  // Number/Integer
  // ----------------------------------  
  if(x.type == 'integer') {
    validation = validation || new IntegerNode(parent, field, {typeCheck:true});
  }

  if(x.type == 'number') {
    validation = validation || new NumberNode(parent, field, {typeCheck:true});
  }

  if(typeof x.minimum == 'number') {
    validation = validation || new NumberNode(parent, field, {});
    // We have an exclusive minimum
    if(x.exclusiveMinimum) {
      validation.addValidation({$gt: x.minimum});
    } else {
      validation.addValidation({$gte: x.minimum});
    }
  }

  if(typeof x.maximum == 'number') {
    validation = validation || new NumberNode(parent, field, {});
    // We have an exclusive minimum
    if(x.exclusiveMaximum) {
      validation.addValidation({$lt: x.maximum});
    } else {
      validation.addValidation({$lte: x.maximum});
    }
  }    

  if(typeof x.multipleOf == 'number') {
    validation = validation || new NumberNode(parent, field, {});
    validation.addValidation({$multipleOf: x.multipleOf});
  }

  // Array
  // ----------------------------------  
  if(x.type == 'array') {
    validation = validation || new ArrayNode(parent, field, {typeCheck:true});
  }

  if(typeof x.maxItems == 'number') {
    validation = validation || new ArrayNode(parent, field, {});
    validation.addValidation({$lte: x.maxItems});
  }

  if(typeof x.minItems == 'number') {
    validation = validation || new ArrayNode(parent, field, {});
    validation.addValidation({$gte: x.minItems});
  }

  if(x.items && Array.isArray(x.items)) {
    validation = validation || new ArrayNode(parent, field, {});
    // Map the items
    x.items.forEach(function(v, i) {
      validation.addPositionalItemValidation(i, mapFields(self, validation, field, v));
    });
  } else if(x.items && !Array.isArray(x.items)) {
    validation = validation || new ArrayNode(parent, field, {});
    validation.addItemValidation(mapFields(self, validation, field, x.items))  
  }

  if(typeof x.additionalItems == 'boolean' || x.additionalItems instanceof Object) {
    validation = validation || new ArrayNode(parent, field, {});
    var additionalItems = typeof x.additionalItems == 'boolean' 
      ? x.additionalItems
      : mapFields(self, validation, field, x.additionalItems); 
    validation.addAdditionalItemsValidation(additionalItems);
  }

  if(x.uniqueItems) {
    validation = validation || new ArrayNode(parent, field, {});
    validation.uniqueItems(x.uniqueItems);
  }

  // Enum
  // ----------------------------------
  if(x.enum) {
    validation = new EnumNode(parent, field, {});
    validation.addEnums(x.enum);
  }

  // Null valude
  // ----------------------------------  
  if(x.type == 'null') {
    validation = validation || new NullNode(parent, field, {typeCheck:true});
  }

  // Default value
  // ----------------------------------
  if(x.default != null && Object.keys(x).length == 1) {
    // validation = new AnyNode();
    return null;
  } else if(x.default != null) {
    validation.setDefault(x.default);
  }

  // Any value goes
  // ----------------------------------  
  if(x == null || Object.keys(x) == 0) {
    validation = new AnyNode();
  }

  return validation; 
}

var extractExternalReferences = function(schema, externalReferences, ids) {
  // Copy the array, letting us keep the right path
  ids = Array.isArray(ids) ? ids.slice(0) : [];

  // console.log("############ extractExternalReferences")
  // console.dir(schema)

  for(var name in schema) {
    // console.dir(name)
    var value = schema[name];
    
    if(name == 'id' && schema['$schema'] == undefined) {
      ids.push(value);
    } else if(name == '$ref') {
      try {
        if(value.match(/http|https/)) {
          // Create the uri
          var uri = url.parse(value);
          // We have a valid uri, go fetch it
          externalReferences.push({uri: uri, schema: schema, url: value});         
        } else if(ids.length > 0) {
          var path = ids.concat(value).join('');
          // Create the uri
          var uri = url.parse(path);
          // Rewrite the reference
          schema['$ref'] = path;
          // We have a valid uri, go fetch it
          externalReferences.push({uri: uri, schema: schema, url: path});
        }
      } catch(err) {
        console.log(err)
      }
    } else if(value instanceof Object) {
      extractExternalReferences(value, externalReferences, ids);
    }
  }
}

var resolveExternalReferences = function(references, cache, callback) {
  var left = references.length;
  var errors = [];

  // Let's resolve the path
  var resolve = function(path, obj) {
    if(path == '#') return obj;
    path = path.substr(1);
    var parts = path.split('/');
    parts.shift();

    // Locate object
    for(var i = 0; i < parts.length; i++) {
      obj = obj[parts[i]];
    }

    return obj;
  }

  // Grab the url
  var executeUrl = function(reference, callback) {
    var url = reference.url;
    var uri = reference.uri;
    var schema = reference.schema;

    // console.log("--------------------------- fetch reference at " + url)

    // Execute the request
    request(url, function(error, response, body) {
      // We have an error
      if(error) return callback(error);     
      // Got the body, parse it
      var obj = JSON.parse(body);

      // console.log("#################################### RESOLVE")
      // Resolve the object
      explode(obj, function(err, obj) {
      // console.log("#################################### RESOLVE 1")
        if(err) return callback(err);

        // Split the url out to locate the right place
        var path = url.substr(url.indexOf('#'));
        // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
        // console.dir(path)
        // console.dir(obj)
        
        // Locate the actual document we want
        var pathObj = resolve(path, obj);

        // // Check the path
        // if(path == '#') {

        // Replace the node
        delete schema['$ref'];
        for(var name in pathObj) {
          schema[name] = pathObj[name];
        }
        // } else {
        //   // console.dir("======================== hey")
        // }

        // Return the result
        callback();
      })
    });
  }

  // No external references return
  if(left == 0) return callback();

  // Grab all the resources
  for(var i = 0; i < references.length; i++) {
    executeUrl(references[i], function(err) {
      left = left - 1;

      // Add the error to the errors
      if(err) errors.push(err);

      // Finished
      if(left == 0) {
        callback(errors.length > 0 ? errors : undefined);
      }
    });
  }
}

var explode = function(schema, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  var seenObjects = [];
  var externalReferences = [];
  var definitions = {};
  var cache = options.cache || {};

  // console.log("--------------------------------------------------- explode ")

  // var schema = require('../t.json')
  // var s = require('fs').readFileSync(__dirname + '/../t.json', 'utf8')
  // console.log(s)
  // var schema = JSON.parse(s)

  // deref2(schema, function(err, fullSchema) {
  //   console.log("####################################################")
  //   console.log(fullSchema)
  // });

  // Find all external references
  extractExternalReferences(schema, externalReferences);
  // console.log("######################################################### extractedReference")
  // console.dir(externalReferences)

  // Resolve all the external references
  resolveExternalReferences(externalReferences, cache, function(err) {
    if(err) return callback(err);

    // console.log("######################################################### resolved")
    // console.dir(schema)

    // Dereference the entire object
    extractReferences(schema, schema, seenObjects, [], options);

    // Return the schema
    callback(null, schema);
  });
}

// De-reference
var deref = function(schema, field, reference, seenObjects, path, options) {
  // Don't resolve recursive relation
  if(reference == '#') return {$ref: '#'}

  // Get the path
  var path = reference.substr(1).split('/').slice(1);
  path = path.map(function(x) {
    x = x.replace(/~1/g, '/').replace(/~0/g, '~');
    return decodeURI(x);
  })

  // Get a pointer to the schema
  var pointer = schema;

  // Traverse the schema
  for(var i = 0; i < path.length; i++) {
    pointer = pointer[path[i]];
  }

  // Check if we have seen the object
  var objects = seenObjects.filter(function(x) {
    return x.obj === pointer;
  });

  if(objects.length == 1) {
    seenObjects[0].count = objects[0].count + 1;
  } else {
    seenObjects.push({obj: pointer, count: 1});
  }

  // Do we have a reference
  if(pointer['$ref']) {
    return deref(schema, field, pointer['$ref'], seenObjects, path, options);
  } else {
    extractReferences(schema, pointer, seenObjects, path, options);
  }

  return pointer;
} 

// Expand the schema
var extractReferences = function(fullSchema, schema, seenObjects, path, options) {
  // Top level reference, dereference it
  if(schema['$ref']) {
    // Dereference 
    var dereference = deref(fullSchema, '', schema["$ref"], seenObjects, options);
    // Delete the tag
    delete(schema['$ref']);
    // Merge the dereferenced value
    for(var name in dereference) {
      schema[name] = dereference[name];
    }
  }

  for(var name in schema) {
    var value = schema[name];
    path.push(name);

    if(value instanceof Object) {
      // Extract the path
      if(value["$ref"]) {
        // Get the reference
        var reference = value["$ref"];       
        // Unroll the reference
        var dereference = deref(fullSchema, name, reference, seenObjects, path, options);
        // Add the dereferenced value
        schema[name] = dereference;
      } else {
        extractReferences(fullSchema, value, seenObjects, path, options);
      }
    }

    path.pop();
  }
}

module.exports = JSONSchema;






