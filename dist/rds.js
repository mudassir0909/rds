/*! rds - v0.0.0 - 2015-08-14
* Copyright (c) 2015 ; Licensed  */
(function() {
var rds = angular.module('rds', []);

rds.provider('RDS', RDSProvider);

function RDSProvider() {
    var dataTransformers = {};
    var stringTransform = {
        serialize: function(value) {
            if (_.isFunction(value.toString)) {
                return value.toString();
            }

            return value;
        }
    };
    var numberTransform = {
        deserialize: function(value, options) {
            var transformedValue = Number(value);

            options = options || {};

            if (!value && options.allowBlank) {
                return;
            }

            if (isNaN(transformedValue)) {
                return options.allowBlank ? null : 0;
            }

            if (options.integer) {
               return parseInt(transformedValue, 10);
            }

            return transformedValue;
        }
    };
    var booleanTransform = {
        deserialize: function(value) {
            return !!value;
        }
    };

    stringTransform.deserialize = stringTransform.serialize;
    numberTransform.deserialize = numberTransform.serialize;
    booleanTransform.deserialize = booleanTransform.serialize;

    this.registerDataTransform = registerDataTransform;

    function registerDataTransform(name, config) {
        dataTransformers[name] = new DataTransform(config);
    }

    function DataTransform(config) {
        this.serialize = config.serialize;
        this.deserialize = config.deserialize;
    }

    registerDataTransform('string', stringTransform);
    registerDataTransform('number', numberTransform);
    registerDataTransform('boolean', booleanTransform);

    this.$get = ['Restangular', '$parse', function(Restangular, $parse) {
        var idAttributeMap = {};
        var _getIdFromElem = Restangular.configuration.getIdFromElem;

        Restangular.configuration.getIdFromElem = function(elem) {
            var idAttribute = idAttributeMap[elem.route];

            if (idAttribute) {
                return $parse(idAttribute)(elem);
            } else if (_.isFunction(_getIdFromElem)) {
                return _getIdFromElem(elem);
            }
        };

        function createRDSService() {
            var service = {
                defineResource: defineResource,
                property: property
            };

            return service;

            function defineResource(name, options) {
                return new Resource(name, options);
            }

            function property(name, options) {
                return new Property(name, options);
            }
        }

        function Property(name, options) {
            this.name = name;
            this.options = options;
        }

        function Resource(name, options) {
            var schema = extractSchema(options);
            var instanceMethods = extractInstanceMethods(options);
            var idAttribute = options.idAttribute;
            var defaults = options.defaults;

            idAttributeMap[name] = idAttribute;

            Restangular.extendModel(name, function(model) {
                _(model).extend(instanceMethods);

                return model;
            });

            Restangular.addElementTransformer(name, false, function(element) {
                // If the idAttribute is undefined then it must be a new record
                var isNewRecord = !element[idAttributeMap[name] || 'id'];

                if (isNewRecord) { //setup defaults
                    _(element).extend(defaults);
                }

                _(schema).each(function(value, key) {
                    var transformer = dataTransformers[value.name];

                    element[key] = transformer.deserialize(element[key], value.options);
                });
            });

            Restangular.addRequestInterceptor(function(element) {
                _(schema).each(function(value, key) {
                    var transformer = dataTransformers[value.name];

                    element[key] = transformer.serialize(element[key], value.options);
                });

                return element;
            });

            this.$restangular = Restangular.service(name);
            this.$new = function(attributes) {
                var restangularizedObject = Restangular.restangularizeElement(null, attributes, name);

                return new Record(restangularizedObject);
            };

            function extractSchema(options) {
                var schema = {};

                _(options).each(function(value, key) {
                    if (value instanceof Property) {
                        schema[key] = value;
                    }
                });

                return schema;
            }

            function extractInstanceMethods(options) {
                var methods = {};

                _(options).each(function(value, key) {
                    if (_.isFunction(value)) {
                        methods[key] = value;
                    }
                });

                return methods;
            }
        }

        Resource.prototype = {
            findAll: function() {
                var promise = this.$restangular.getList.apply(this.$restangular, arguments);

                return new Collection(promise);
            },

            find: function() {
                var id = arguments[0];
                var args = _.rest(arguments);
                var restangularizedObject = this.$restangular.one(id);
                var record = new Record(restangularizedObject);

                record.$promise = record.get.apply(record, args);

                return record;
            },

            create: function(attributes) {
                var record = this.$new(attributes);

                return record.save();
            }
        };

        function Collection(promise) {
            var self = this;

            this.isLoaded = false;
            this.$promise = promise;
            this.records = [];

            promise.then(function(response) {
                _(response).each(function(item) {
                    self.records.push(new Record(item, self));
                });
            })
            .finally(function() {
                self.isLoaded = true;
            });
        }

        Collection.prototype = {
            push: function(record) {
                record.setCollection(this);
                this.records.push(record);

                return this;
            },

            pushObjects: function(records) {
                _(records).each(this.push, this);

                return this;
            }
        };

        function Record(restangularizedObject, collection) {
            var _get, _save, _remove;

            _(this).extend(restangularizedObject);

            this.isLoaded = false;
            this.setCollection(collection);

            _get = this.get;
            _save = this.save;
            _remove = this.remove;

            this.get = function() {
                var self = this;

                this.isLoaded = false;

                this.$promise = _get.apply(this, arguments).finally(function() {
                    self.isLoaded = true;
                });

                return this;
            };

            this.save = function() {
                var self = this;

                this.isSaving = true;

                this.$promise = _save.apply(this, arguments).finally(function() {
                    self.isSaving = false;
                });

                return this;
            };

            this.remove = function() {
                if (this.isNewRecord()) {
                    return;
                }

                var self = this;

                this.isRemoving = true;

                this.$promise = _remove.apply(this, arguments).then(function() {
                    if (_.isArray(self.collection)) {
                        self.collection.splice(self.collection.indexOf(self), 1);
                    }
                });

                return this;
            };

            this.refresh = _.bind(this.get, this);
        }

        Record.prototype = {
            isNewRecord: function() {
                var idAttribute = idAttributeMap[this.route] || 'id';

                return !this[idAttribute];
            },

            setCollection: function(collection) {
                this.collection = collection;

                return this;
            }
        };

        return createRDSService();
    }];
}
})();
