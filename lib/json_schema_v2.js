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
  OneOfNode = require('vitesse').OneOfNode;

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
    // // We need to correctly resolve all the references
    // ast = resolveRecursive(ast, ast);
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
  // Explode the schema
  // this.schema = explode(schema, clone(this.options), function(err, schema) {
  console.log("-------------------------------------------------------- exploded schema")
  console.log(JSON.stringify(schema, null, 2))
  // if(err) return callback(err);
  var result = mapFields(self, null, null, schema);
  callback(null, result);
  // });
}

var mapFields = function(self, parent, field, x) {
  var validation = null;
  // skipOnWrongType = typeof skipOnWrongType == 'boolean' ? skipOnWrongType : false;

  // // Integer
  // // ----------------------------------  
  // if(x.type && x.type == 'integer') {
  //   validation = new IntegerType({performTypeCheck:true});
  // }

  // // Number
  // // ----------------------------------  
  // if(x.type && x.type == 'number') {
  //   validation = new NumberType({performTypeCheck:true});
  // }

  // // Object
  // // ----------------------------------  
  // if(x.type && x.type == 'object') {
  //   validation = new DocumentType({performTypeCheck:true});
  // }

  // // Array
  // // ----------------------------------  
  // if(x.type && x.type == 'array') {
  //   validation = new ArrayType({performTypeCheck:true});
  // }

  // // Null
  // // ----------------------------------  
  // if(x.type && x.type == 'null') {
  //   validation = new NullType({performTypeCheck:true});
  // }

  // // Boolean
  // // ----------------------------------  
  // if(x.type && x.type == 'boolean') {
  //   validation = new BooleanType({performTypeCheck:true});
  // }

  // // String
  // // ----------------------------------
  // if(x.type && x.type =='string') {
  //   validation = StringType({performTypeCheck:true});
  // }

  // // Not
  // // ----------------------------------
  // if(x.not) {
  //   validation = new NotType({
  //     validations: [mapFields(self, x.not)]
  //   });
  // } 

  // // We have a recursive reference
  // // -----------------------------------
  // if(x['$ref']) {
  //   console.log("################################## FOUND RecursiveReferenceType " + x['$ref'])
  //   console.dir(x)
  //   validation = new RecursiveReferenceType({path: x['$ref']});
  // }

  // // Top level mappable fields
  // // ----------------------------------
  // var mergeValidations = function(x, v) {
  //   var mappableFields = ['type', 'required'];
  //   // Clone the value
  //   v = clone(v);
  //   // Check if we have any other top level fields
  //   for(var name in x) {
  //     if(mappableFields.indexOf(name) != -1) {
  //       if(!Array.isArray(v[name])) {
  //         v[name] = x[name];          
  //       } else {
  //         v[name] = v[name].concat(x[name]);
  //       }
  //     }
  //   }

  //   return v;
  // }

  // if(x.oneOf) {
  //   validation = new OneOfType({
  //     validations: x.oneOf.map(function(v) {
  //       return mapFields(self, mergeValidations(x,v));
  //     })
  //   });
  // } 

  // if(x.anyOf) {
  //   validation = new AnyOfType({
  //     validations: x.anyOf.map(function(v) {
  //       return mapFields(self, mergeValidations(x,v));
  //     })
  //   });
  // } 

  // if(x.allOf) {
  //   // Filter out any default only validations and set on the top Level one
  //   var defaultValidation = x.allOf.filter(function(v) {
  //     if(v['default'] !== undefined) {
  //       return true;
  //     }
  //   });

  //   // If we have a defaultValidation cleanup
  //   var allOf = x.allOf.filter(function(v) {
  //     if(v['default'] === undefined) {
  //       return true;
  //     }
  //   });

  //   var allOf = allOf.map(function(v) {
  //     var merged = mergeValidations(x,v);
  //     return mapFields(self, merged);
  //   })

  //   validation = new AllOfType({
  //     validations: allOf
  //   });

  //   // Set a default
  //   if(defaultValidation) {
  //     validation.default = defaultValidation.default;
  //   }
  // } 

  // // Multiple types
  // // ----------------------------------
  // if(Array.isArray(x.type)) {
  //   // Generate objects for the schemas
  //   var validations = [];
  //   var types = x.type.slice(0);

  //   // Iterate over all the types
  //   for(var i = 0; i < x.type.length; i++) {
  //     var object = clone(x);
  //     object.type = x.type[i];
  //     validations.push(object);
  //   }

  //   // Create the type
  //   validation = new OneOfType({
  //     validations: validations.map(function(x) {
  //       return mapFields(self, x);
  //     })
  //   });
  // }

  // // Number/Integer
  // // ----------------------------------  
  // if(typeof x.minimum == 'number') {
  //   validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
  //   validation.object.validations = validation.object.validations || {};      

  //   // We have an exclusive minimum
  //   if(x.exclusiveMinimum) {
  //     validation.object.validations['$gt'] = x.minimum;
  //   } else {
  //     validation.object.validations['$gte'] = x.minimum;
  //   }
  // }

  // if(typeof x.maximum == 'number') {
  //   validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
  //   validation.object.validations = validation.object.validations || {};

  //   // We have an exclusive minimum
  //   if(x.exclusiveMaximum) {
  //     validation.object.validations['$lt'] = x.maximum;
  //   } else {
  //     validation.object.validations['$lte'] = x.maximum;
  //   }
  // }    

  // if(typeof x.multipleOf == 'number') {
  //   validation = validation || new NumberType({performTypeCheck: false});
  //   validation.object.validations = validation.object.validations || {};   
  //   // We have an exclusive minimum
  //   validation.object.validations['$multipleOf'] = x.multipleOf;
  // }

  // // String
  // // ----------------------------------  
  // if(typeof x.minLength == 'number') {
  //   validation = validation || new StringType({performTypeCheck: skipOnWrongType});
  //   validation.object.validations = validation.object.validations || {};
  //   validation.object.validations['$gte'] = x.minLength;
  // }

  // if(typeof x.maxLength == 'number') {
  //   validation = validation || new StringType({performTypeCheck: skipOnWrongType});
  //   validation.object.validations = validation.object.validations || {};
  //   validation.object.validations['$lte'] = x.maxLength;
  // }

  // // Array
  // // ----------------------------------  
  // if(typeof x.maxItems == 'number') {
  //   validation = validation || new ObjectNode(parent, field, {});
  //   validation.addValidation({$lte: x.maxItems});
  // }

  // if(typeof x.minItems == 'number') {
  //   validation = validation || new ArrayType({performTypeCheck: skipOnWrongType});
  //   validation.object.validations = validation.object.validations || {};
  //   validation.object.validations['$gte'] = x.minItems;
  // }

  // // Pattern
  // // ----------------------------------
  // if(x.pattern) {
  //   validation = validation || new StringType({performTypeCheck: false});
  //   validation.object.validations = validation.object.validations || {};
  //   validation.object.validations['$regexp'] = x.pattern;
  // } 

  // // Object
  // // ----------------------------------
  // if(x.properties || x.additionalProperties || x.patternProperties) {
  //   validation = validation || new DocumentType({performTypeCheck:false});
  //   validation.object.fields = validation.object.fields || {};

  //   // Does the top level schema have properties
  //   if(x.properties) {
  //     // Properties
  //     var properties = clone(x.properties);
  //     // Iterate over all the properties
  //     for(var name in properties) {
  //       // console.log("------------------------------------ process property :: " + name)
  //       validation.object.fields[name] = mapFields(self, properties[name], skipOnWrongType);
        
  //       // Check if the properties contains an empty not field, signifying the
  //       // field should not be included
  //       if(properties[name].not && Object.keys(properties[name].not).length == 0) {
  //         validation.object.prohibited = validation.object.prohibited || [];
  //         validation.object.prohibited.push(name);
  //       }
  //     }
  //   }

  //   // If additonalFields is a object
  //   if(x.additionalProperties != null && typeof x.additionalProperties == 'object') {
  //     validation.object.additionalProperties = mapFields(self, x.additionalProperties);
  //   } else if(typeof x.additionalProperties === 'boolean') {
  //     validation.object.additionalProperties = x.additionalProperties;
  //   }

  //   // Iterate over all the patterns
  //   for(var name in x.patternProperties) {
  //     var field = x.patternProperties[name];
  //     if(!validation.object.patternProperties) validation.object.patternProperties = {};
  //     validation.object.patternProperties[name] = mapFields(self, field);
  //   }
  // }

  // // Items
  // // ----------------------------------
  // if(x.items) {
  //   validation = validation || new ArrayType({performTypeCheck: false});

  //   // "items": [{}],
  //   if(Array.isArray(x.items) && x.additionalItems == false) {
  //     validation.object.validations = validation.object.validations || {};
  //     validation.object.validations['$lte'] = x.items.length; 

  //     // Map the validations
  //     validation.object.of = x.items.map(function(x, i) {
  //       return {index: i, schema: mapFields(self, x)};
  //     });
  //   } else if(Array.isArray(x.items) && x.additionalItems == null) {
  //     // Map the validations
  //     validation.object.of = x.items.map(function(x, i) {
  //       return {index: i, schema: mapFields(self, x)};
  //     });
  //   } else if(Array.isArray(x.items) && (x.additionalItems != null && typeof x.additionalItems == 'object')) {
  //     // Map the validations
  //     validation.object.of = x.items.map(function(x, i) {
  //       return {index: i, schema: mapFields(self, x)};
  //     });

  //     // Set a conditional validation that applies from  schema.items.length and forward
  //     validation.object.of.push({
  //       validations: {$gte: x.items.length},
  //       schema: mapFields(self, x.additionalItems)
  //     });
  //   } else if(!Array.isArray(x.items) && (x.additionalItems == false || x.additionalItems == null)) {
  //     validation.object.of = mapFields(self, x.items);
  //   }
  // }

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

      return mapFields(self, parent, field, v);
    });
    // Set the validations
    validation.addValidations(items);
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

  // Object
  // ----------------------------------  
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
      patterns[name] = mapFields(self, parent, field, x.patternProperties[name]);
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

      validation.addChild(name, mapFields(self, parent, field, x.properties[name]));
    }

    // Prohibited fields
    if(prohibited.length > 0) {
      validation.prohibitedFields(prohibited);
    }
  }

  if(x.additionalProperties) {
    validation = validation || new ObjectNode(parent, field, {});
    validation.addAdditionalPropertiesValidator(mapFields(self, parent, field, x.additionalProperties));
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
      validation.addPositionalItemValidation(i, mapFields(self, parent, field, v));
    });
  } else if(x.items && !Array.isArray(x.items)) {
    validation = validation || new ArrayNode(parent, field, {});
    validation.addItemValidation(mapFields(self, parent, field, x.items))  
  }

  if(typeof x.additionalItems == 'boolean' || x.additionalItems instanceof Object) {
    validation = validation || new ArrayNode(parent, field, {});
    var additionalItems = typeof x.additionalItems == 'boolean' 
      ? x.additionalItems
      : mapFields(self, parent, field, x.additionalItems); 
    validation.addAdditionalItemsValidation(additionalItems);
  }

  if(x.uniqueItems) {
    validation = validation || new ArrayNode(parent, field, {});
    validation.uniqueItems(x.uniqueItems);
  }

  // Any value goes
  // ----------------------------------  
  if(x == null || Object.keys(x) == 0) {
    validation = new AnyNode();
  }

  // if(typeof x.maxProperties == 'number') {
  //   validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
  //   validation.object.fields = validation.object.fields || {};
  //   validation.object.validations = validation.object.validations || {};
  //   validation.object.validations['$lte'] = x.maxProperties;
  // }

  // if(typeof x.minProperties == 'number') {
  //   validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
  //   validation.object.fields = validation.object.fields || {};
  //   validation.object.validations = validation.object.validations || {};
  //   validation.object.validations['$gte'] = x.minProperties;
  // }

  // // UniqueItems
  // // ----------------------------------
  // if(x.uniqueItems) {
  //   validation = validation || new ArrayType({performTypeCheck: false});
  //   validation.object.unique = true;
  // }

  // // Requires
  // // ----------------------------------
  // if(x.required) {
  //   validation = validation || new DocumentType({});
  //   // Get the required fields
  //   var required = x.required.slice(0);
  //   // Add the object required fields
  //   validation.object.required = required;
  // }

  // // Enum
  // // ----------------------------------
  // if(x.enum) {
  //   validation = new EnumType({enum: x.enum, ast: validation})
  // }

  // // Set any value as validation
  // if(validation == null) {
  //   validation = new AnyType({});
  // }

  // // We have a default value
  // if(x.default) {
  //   // console.log("===================================== default")
  //   // No type check if we have a default value specified
  //   if(typeof validation.object.performTypeCheck == 'boolean') {
  //     validation.object.performTypeCheck = false;
  //   }
    
  //   // Set the default value for the field
  //   validation.object.default = x.default;
  //   // console.dir(validation)
  // }

  return validation; 
}


// var resolveRecursive = function(root, ast) {
//   if(ast instanceof DocumentType) {
//     for(var name in ast.object.fields) {
//       var obj = ast.object.fields[name];
//       resolveRecursive(root, obj);
//     }
//   } else if(ast instanceof RecursiveReferenceType) {
//     ast.object.node = resolvePath(root, ast.object.path);
//   }

//   return ast;
// }

// var resolvePath = function(root, path) {
//   if(path === '#') return root;
// }

// var CompileState = function(schema, options) {
//   this.schema = schema;
//   this.options = options || {};
// }

// var extractExternalReferences = function(schema, externalReferences) {
//   for(var name in schema) {
//     var value = schema[name];

//     if(name == '$ref') {
//       try {
//         if(value.match(/http|https/)) {
//           var uri = url.parse(value);
//           // We have a valid uri, go fetch it
//           externalReferences.push({uri: uri, schema: schema, url: value});         
//         }
//       } catch(err) {
//         console.log(err)
//       }
//     } else if(value instanceof Object) {
//       extractExternalReferences(value, externalReferences);
//     }
//   }
// }

// var resolveExternalReferences = function(references, callback) {
//   var left = references.length;
//   var errors = [];

//   // Grab the url
//   var executeUrl = function(reference, callback) {
//     var url = reference.url;
//     var uri = reference.uri;
//     var schema = reference.schema;

//     // console.log("--------------------------- fetch reference at " + url)

//     // Execute the request
//     request(url, function(error, response, body) {
//       if(error) return callback(error);     
//       // Got the body, parse it
//       var obj = JSON.parse(body);
//       // console.log(body)

//       // Split the url out to locate the right place
//       var path = url.substr(url.indexOf('#'));
      
//       // Check the path
//       if(path == '#') {
//         // Replace the whole object
//         delete schema['$ref'];
//         for(var name in obj) {
//           schema[name] = obj[name];
//         }
//       } else {
//         // console.dir("======================== hey")
//       }

//       // Return the result
//       callback();
//     });
//   }

//   // No external references return
//   if(left == 0) return callback();

//   // Grab all the resources
//   for(var i = 0; i < references.length; i++) {
//     executeUrl(references[i], function(err) {
//       left = left - 1;

//       // Add the error to the errors
//       if(err) errors.push(err);

//       // Finished
//       if(left == 0) {
//         callback(errors.length > 0 ? errors : undefined);
//       }
//     });
//   }
// }

// var explode = function(schema, options, callback) {
//   var seenObjects = [];
//   var externalReferences = [];

//   // Find all external references
//   extractExternalReferences(schema, externalReferences);

//   // Resolve all the external references
//   resolveExternalReferences(externalReferences, function(err) {
//     if(err) return callback(err);

//     // Dereference the entire object
//     extractReferences(schema, schema, seenObjects, [], options);

//     // Return the schema
//     callback(null, schema);
//   });
// }

// // De-reference
// var deref = function(schema, field, reference, seenObjects, path, options) {
//   // Don't resolve recursive relation
//   if(reference == '#') return {$ref: '#'}

//   // Get the path
//   var path = reference.substr(1).split('/').slice(1);
//   path = path.map(function(x) {
//     x = x.replace(/~1/g, '/').replace(/~0/g, '~');
//     return decodeURI(x);
//   })

//   // Get a pointer to the schema
//   var pointer = schema;

//   // Traverse the schema
//   for(var i = 0; i < path.length; i++) {
//     pointer = pointer[path[i]];
//   }

//   // Check if we have seen the object
//   var objects = seenObjects.filter(function(x) {
//     return x.obj === pointer;
//   });

//   if(objects.length == 1) {
//     seenObjects[0].count = objects[0].count + 1;
//   } else {
//     seenObjects.push({obj: pointer, count: 1});
//   }

//   // Do we have a reference
//   if(pointer['$ref']) {
//     return deref(schema, field, pointer['$ref'], seenObjects, path, options);
//   } else {
//     extractReferences(schema, pointer, seenObjects, path, options);
//   }

//   return pointer;
// } 

// // Expand the schema
// var extractReferences = function(fullSchema, schema, seenObjects, path, options) {
//   // Top level reference, dereference it
//   if(schema['$ref']) {
//     // Dereference 
//     var dereference = deref(fullSchema, '', schema["$ref"], seenObjects, options);
//     // Delete the tag
//     delete(schema['$ref']);
//     // Merge the dereferenced value
//     for(var name in dereference) {
//       schema[name] = dereference[name];
//     }
//   }

//   for(var name in schema) {
//     var value = schema[name];
//     path.push(name);

//     if(value instanceof Object) {
//       // Extract the path
//       if(value["$ref"]) {
//         // Get the reference
//         var reference = value["$ref"];       
//         // Unroll the reference
//         var dereference = deref(fullSchema, name, reference, seenObjects, path, options);
//         // Add the dereferenced value
//         schema[name] = dereference;
//       } else {
//         extractReferences(fullSchema, value, seenObjects, path, options);
//       }
//     }

//     path.pop();
//   }
// }

// CompileState.prototype.buildAST = function(schema, callback) {
//   var self = this;
//   // Explode the schema
//   this.schema = explode(schema, clone(this.options), function(err, schema) {
//     console.log("-------------------------------------------------------- exploded schema")
//     console.log(JSON.stringify(schema, null, 2))
//     if(err) return callback(err);
//     var result = mapFields(self, schema);
//     callback(null, result);
//   });
// }

// var resolveObject = function(self, path) {
//   if(path == '#') return {state: self};
// }

// var mapFields = function(self, x, skipOnWrongType) {
//   var validation = null;
//   skipOnWrongType = typeof skipOnWrongType == 'boolean' ? skipOnWrongType : false;

//   // Integer
//   // ----------------------------------  
//   if(x.type && x.type == 'integer') {
//     validation = new IntegerType({performTypeCheck:true});
//   }

//   // Number
//   // ----------------------------------  
//   if(x.type && x.type == 'number') {
//     validation = new NumberType({performTypeCheck:true});
//   }

//   // Object
//   // ----------------------------------  
//   if(x.type && x.type == 'object') {
//     validation = new DocumentType({performTypeCheck:true});
//   }

//   // Array
//   // ----------------------------------  
//   if(x.type && x.type == 'array') {
//     validation = new ArrayType({performTypeCheck:true});
//   }

//   // Null
//   // ----------------------------------  
//   if(x.type && x.type == 'null') {
//     validation = new NullType({performTypeCheck:true});
//   }

//   // Boolean
//   // ----------------------------------  
//   if(x.type && x.type == 'boolean') {
//     validation = new BooleanType({performTypeCheck:true});
//   }

//   // String
//   // ----------------------------------
//   if(x.type && x.type =='string') {
//     validation = StringType({performTypeCheck:true});
//   }

//   // Not
//   // ----------------------------------
//   if(x.not) {
//     validation = new NotType({
//       validations: [mapFields(self, x.not)]
//     });
//   } 

//   // We have a recursive reference
//   // -----------------------------------
//   if(x['$ref']) {
//     console.log("################################## FOUND RecursiveReferenceType " + x['$ref'])
//     console.dir(x)
//     validation = new RecursiveReferenceType({path: x['$ref']});
//   }

//   // Top level mappable fields
//   // ----------------------------------
//   var mergeValidations = function(x, v) {
//     var mappableFields = ['type', 'required'];
//     // Clone the value
//     v = clone(v);
//     // Check if we have any other top level fields
//     for(var name in x) {
//       if(mappableFields.indexOf(name) != -1) {
//         if(!Array.isArray(v[name])) {
//           v[name] = x[name];          
//         } else {
//           v[name] = v[name].concat(x[name]);
//         }
//       }
//     }

//     return v;
//   }

//   if(x.oneOf) {
//     validation = new OneOfType({
//       validations: x.oneOf.map(function(v) {
//         return mapFields(self, mergeValidations(x,v));
//       })
//     });
//   } 

//   if(x.anyOf) {
//     validation = new AnyOfType({
//       validations: x.anyOf.map(function(v) {
//         return mapFields(self, mergeValidations(x,v));
//       })
//     });
//   } 

//   if(x.allOf) {
//     // Filter out any default only validations and set on the top Level one
//     var defaultValidation = x.allOf.filter(function(v) {
//       if(v['default'] !== undefined) {
//         return true;
//       }
//     });

//     // If we have a defaultValidation cleanup
//     var allOf = x.allOf.filter(function(v) {
//       if(v['default'] === undefined) {
//         return true;
//       }
//     });

//     var allOf = allOf.map(function(v) {
//       var merged = mergeValidations(x,v);
//       return mapFields(self, merged);
//     })

//     validation = new AllOfType({
//       validations: allOf
//     });

//     // Set a default
//     if(defaultValidation) {
//       validation.default = defaultValidation.default;
//     }
//   } 

//   // Multiple types
//   // ----------------------------------
//   if(Array.isArray(x.type)) {
//     // Generate objects for the schemas
//     var validations = [];
//     var types = x.type.slice(0);

//     // Iterate over all the types
//     for(var i = 0; i < x.type.length; i++) {
//       var object = clone(x);
//       object.type = x.type[i];
//       validations.push(object);
//     }

//     // Create the type
//     validation = new OneOfType({
//       validations: validations.map(function(x) {
//         return mapFields(self, x);
//       })
//     });
//   }

//   // Number/Integer
//   // ----------------------------------  
//   if(typeof x.minimum == 'number') {
//     validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
//     validation.object.validations = validation.object.validations || {};      

//     // We have an exclusive minimum
//     if(x.exclusiveMinimum) {
//       validation.object.validations['$gt'] = x.minimum;
//     } else {
//       validation.object.validations['$gte'] = x.minimum;
//     }
//   }

//   if(typeof x.maximum == 'number') {
//     validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
//     validation.object.validations = validation.object.validations || {};

//     // We have an exclusive minimum
//     if(x.exclusiveMaximum) {
//       validation.object.validations['$lt'] = x.maximum;
//     } else {
//       validation.object.validations['$lte'] = x.maximum;
//     }
//   }    

//   if(typeof x.multipleOf == 'number') {
//     validation = validation || new NumberType({performTypeCheck: false});
//     validation.object.validations = validation.object.validations || {};   
//     // We have an exclusive minimum
//     validation.object.validations['$multipleOf'] = x.multipleOf;
//   }

//   // String
//   // ----------------------------------  
//   if(typeof x.minLength == 'number') {
//     validation = validation || new StringType({performTypeCheck: skipOnWrongType});
//     validation.object.validations = validation.object.validations || {};
//     validation.object.validations['$gte'] = x.minLength;
//   }

//   if(typeof x.maxLength == 'number') {
//     validation = validation || new StringType({performTypeCheck: skipOnWrongType});
//     validation.object.validations = validation.object.validations || {};
//     validation.object.validations['$lte'] = x.maxLength;
//   }

//   // Array
//   // ----------------------------------  
//   if(typeof x.maxItems == 'number') {
//     validation = validation || new ArrayType({performTypeCheck: skipOnWrongType});
//     validation.object.validations = validation.object.validations || {};
//     validation.object.validations['$lte'] = x.maxItems;
//   }

//   if(typeof x.minItems == 'number') {
//     validation = validation || new ArrayType({performTypeCheck: skipOnWrongType});
//     validation.object.validations = validation.object.validations || {};
//     validation.object.validations['$gte'] = x.minItems;
//   }

//   // Pattern
//   // ----------------------------------
//   if(x.pattern) {
//     validation = validation || new StringType({performTypeCheck: false});
//     validation.object.validations = validation.object.validations || {};
//     validation.object.validations['$regexp'] = x.pattern;
//   } 

//   // Object
//   // ----------------------------------
//   if(x.properties || x.additionalProperties || x.patternProperties) {
//     validation = validation || new DocumentType({performTypeCheck:false});
//     validation.object.fields = validation.object.fields || {};

//     // Does the top level schema have properties
//     if(x.properties) {
//       // Properties
//       var properties = clone(x.properties);
//       // Iterate over all the properties
//       for(var name in properties) {
//         // console.log("------------------------------------ process property :: " + name)
//         validation.object.fields[name] = mapFields(self, properties[name], skipOnWrongType);
        
//         // Check if the properties contains an empty not field, signifying the
//         // field should not be included
//         if(properties[name].not && Object.keys(properties[name].not).length == 0) {
//           validation.object.prohibited = validation.object.prohibited || [];
//           validation.object.prohibited.push(name);
//         }
//       }
//     }

//     // If additonalFields is a object
//     if(x.additionalProperties != null && typeof x.additionalProperties == 'object') {
//       validation.object.additionalProperties = mapFields(self, x.additionalProperties);
//     } else if(typeof x.additionalProperties === 'boolean') {
//       validation.object.additionalProperties = x.additionalProperties;
//     }

//     // Iterate over all the patterns
//     for(var name in x.patternProperties) {
//       var field = x.patternProperties[name];
//       if(!validation.object.patternProperties) validation.object.patternProperties = {};
//       validation.object.patternProperties[name] = mapFields(self, field);
//     }
//   }

//   // Items
//   // ----------------------------------
//   if(x.items) {
//     validation = validation || new ArrayType({performTypeCheck: false});

//     // "items": [{}],
//     if(Array.isArray(x.items) && x.additionalItems == false) {
//       validation.object.validations = validation.object.validations || {};
//       validation.object.validations['$lte'] = x.items.length; 

//       // Map the validations
//       validation.object.of = x.items.map(function(x, i) {
//         return {index: i, schema: mapFields(self, x)};
//       });
//     } else if(Array.isArray(x.items) && x.additionalItems == null) {
//       // Map the validations
//       validation.object.of = x.items.map(function(x, i) {
//         return {index: i, schema: mapFields(self, x)};
//       });
//     } else if(Array.isArray(x.items) && (x.additionalItems != null && typeof x.additionalItems == 'object')) {
//       // Map the validations
//       validation.object.of = x.items.map(function(x, i) {
//         return {index: i, schema: mapFields(self, x)};
//       });

//       // Set a conditional validation that applies from  schema.items.length and forward
//       validation.object.of.push({
//         validations: {$gte: x.items.length},
//         schema: mapFields(self, x.additionalItems)
//       });
//     } else if(!Array.isArray(x.items) && (x.additionalItems == false || x.additionalItems == null)) {
//       validation.object.of = mapFields(self, x.items);
//     }
//   }

//   if(typeof x.maxProperties == 'number') {
//     validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
//     validation.object.fields = validation.object.fields || {};
//     validation.object.validations = validation.object.validations || {};
//     validation.object.validations['$lte'] = x.maxProperties;
//   }

//   if(typeof x.minProperties == 'number') {
//     validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
//     validation.object.fields = validation.object.fields || {};
//     validation.object.validations = validation.object.validations || {};
//     validation.object.validations['$gte'] = x.minProperties;
//   }

//   // UniqueItems
//   // ----------------------------------
//   if(x.uniqueItems) {
//     validation = validation || new ArrayType({performTypeCheck: false});
//     validation.object.unique = true;
//   }

//   // Requires
//   // ----------------------------------
//   if(x.required) {
//     validation = validation || new DocumentType({});
//     // Get the required fields
//     var required = x.required.slice(0);
//     // Add the object required fields
//     validation.object.required = required;
//   }

//   // Enum
//   // ----------------------------------
//   if(x.enum) {
//     validation = new EnumType({enum: x.enum, ast: validation})
//   }

//   // Set any value as validation
//   if(validation == null) {
//     validation = new AnyType({});
//   }

//   // We have a default value
//   if(x.default) {
//     // console.log("===================================== default")
//     // No type check if we have a default value specified
//     if(typeof validation.object.performTypeCheck == 'boolean') {
//       validation.object.performTypeCheck = false;
//     }
    
//     // Set the default value for the field
//     validation.object.default = x.default;
//     // console.dir(validation)
//   }

//   return validation; 
// }



module.exports = JSONSchema;






