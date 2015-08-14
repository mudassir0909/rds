#RDS (Restangular Data Store)

RDS is an AngularJS based data store which is built on top of [Restangular](https://github.com/mgonto/restangular).

#Why do we need RDS ?

The model part of MVC* in AngularJS is the scope object which is more of a view model & I found data model to be the missing piece in AngularJS. The traditional way of dealing with data model using `$http` seemed pretty hard to maintain on a complex web application. And coming to AngularJS after building complex web applications using EmberJS & BackboneJS, I was really missing a standard way to organize data models in AngularJS similar to `Backbone.Model`, `Backbone.Collection` & ember data.

I wanted a way to define my data model schema, enhance certain properties, cache certain records, add custom methods & make it more robust. I did alot of research & found [Restangular](https://github.com/mgonto/restangular) to be pretty exquisite but it is missing datastore. This module aims to fill that gap. I also plan to bring the best of features from ember data, backbone model-collections.

#Usage

## Defining the model resource

```js
angular
    .module('app')
    .factory('User', User);

function User(RDS) {
    return RDS.defineResource('users', {
        defaults: {
            admin: false
        },
        idAttribute: 'userID',
        firstName: RDS.property('string'),
        lastName: RDS.property('string'),
        age: RDS.property('number'),
        admin: RDS.property('boolean'),
        birthDay: RDS.property('date'),
        fullName: fullName // instance method
    });

    function fullName() {
        return this.firstName + this.lastName;
    }
}
```

## Accessing the model

```js
angular
    .module('app')
    .controller('UserController', UserController);

function UserController($scope, User) {
    // does GET /users
    $scope.users = User.findAll();
    // does GET /users?admin=true
    $scope.admin_users = User.findAll({admin: true});

    /*
     Suppose the backend returned the following result set

     [{
        "userID": 1,
        "firstName": "Mudassir",
        "lastName": "Ali",
        "age": "23", // Deliberately using stringfied number for illustration
        "admin": "true",
        "birthday": "2015-08-14T16:41:15.969Z"
    }]
    */
    var user = $scope.admin_users.records[0];
    console.log(user.age) //=> 23, although server returned a stringified version it gets casted to number
    console.log(user.birthDay) // would be a a javascript date object
    console.log(user.fullName()) // Mudassir Ali

    $scope.new_user = User.$new({
        firstName: "Bruce",
        lastName: "Wayne"
    });
    console.log($scope.new_user.admin); //=> false, since we have specified it in defaults
    $scope.new_user.isNewRecord(); //=> true
    $scope.new_user.save(); // Does POST /users

    $scope.user = User.find(2); // Does GET /users/2
    $scope.user.lastName = "Stark";
    console.log($scope.user.userID); // 2
    $scope.user.save(); // Does PUT /users/2, it uses userID as the id attribute

    // This is equivalent to .$new() + .save()
    $scope.another_user = User.create({firstName: "Tony", lastName: "Stark"});

    // You can access the $promise object as follows
    $scope.user.save().$promise.then(function() {
        alert("User created successfully");
        console.log($scope.user.isSaving); //=> false
    });
    console.log($scope.user.isSaving); //=> true, you can use this property to display a loader

    var user = User.find(2).$promise.then(function() {
        console.log(user.isLoaded); //=> true
    });
    console.log(user.isLoaded); //=> false, again bind this to a loader

    // Now into more interesting stuff
    $scope.yet_another_new_user = User.create({firstName: "Bruce", lastName: "Banner"});
    $scope.users.push($scope.yet_another_user); // Assume we are binding this list into template somewhere
    /*
        Does DELETE /users/{userID}
        In addition to that this object will also be removed from the $scope.users collection
        as well after successful deletion & eventually be removed from the UI where it was
        bound via ng-repeat, pretty cool, right ?
    */
    $scope.yet_another_new_user.remove();
}
```

## Referencing it in the template
```html
<spinner data-ng-hide="users.isLoaded"></spinner>
<ul data-ng-repeat="user in users" data-ng-show="users.isLoaded">
    <li>{{user.fullName()}}</li>
</ul>
```

## TODO
* Each record would have a property `$dirty` to indicate if it has unsaved changes
* Each record would have a method `changedAttributes()` which returns a list of changed attributes
* Each record would have a method `rollback()` which rollsback the changes
* Each collection would have a method `findWhere()` which returns an object from the collection for the given query
* Each collection would have a method `where()` which returns a list of objects from the collection for the given query

#Dependencies

RDS depends on Angular and Restangular(which means you need underscore/loadash too ;) )
