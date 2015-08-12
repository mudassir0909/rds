(function() {
var rds = angular.module('rds', []);

rds.provider('RDS', RDSProvider);

function RDSProvider() {
    function createRDSService() {
        var service = {
            defineResource: defineResource,
            property: property,
            belongsTo: belongsTo,
            hasMany: hasMany
        };

        return service;

        function defineResource() {}

        function property() {}

        function belongsTo() {}

        function hasMany() {}
    }

    this.$get = ['Restangular', function(Restangular) {
        return createRDSService();
    }];
}
})();
