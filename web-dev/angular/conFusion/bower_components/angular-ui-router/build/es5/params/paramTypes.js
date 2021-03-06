var common_1 = require("../common/common");
var coreservices_1 = require("../common/coreservices");
var type_1 = require("./type");
var swapString = function (search, replace) { return function (val) { return val != null ? val.toString().replace(search, replace) : val; }; };
var valToString = swapString(/\//g, "%2F");
var valFromString = swapString(/%2F/g, "/");
var ParamTypes = (function () {
    function ParamTypes() {
        this.enqueue = true;
        this.typeQueue = [];
        this.defaultTypes = {
            hash: {
                encode: valToString,
                decode: valFromString,
                is: common_1.is(String),
                pattern: /.*/,
                equals: common_1.val(true)
            },
            string: {
                encode: valToString,
                decode: valFromString,
                is: common_1.is(String),
                pattern: /[^/]*/
            },
            int: {
                encode: valToString,
                decode: function (val) { return parseInt(val, 10); },
                is: function (val) { return common_1.isDefined(val) && this.decode(val.toString()) === val; },
                pattern: /-?\d+/
            },
            bool: {
                encode: function (val) { return val && 1 || 0; },
                decode: function (val) { return parseInt(val, 10) !== 0; },
                is: common_1.is(Boolean),
                pattern: /0|1/
            },
            date: {
                encode: function (val) {
                    return !this.is(val) ? undefined : [
                        val.getFullYear(),
                        ('0' + (val.getMonth() + 1)).slice(-2),
                        ('0' + val.getDate()).slice(-2)
                    ].join("-");
                },
                decode: function (val) {
                    if (this.is(val))
                        return val;
                    var match = this.capture.exec(val);
                    return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
                },
                is: function (val) { return val instanceof Date && !isNaN(val.valueOf()); },
                equals: function (a, b) { return this.is(a) && this.is(b) && a.toISOString() === b.toISOString(); },
                pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
                capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/
            },
            json: {
                encode: common_1.toJson,
                decode: common_1.fromJson,
                is: common_1.is(Object),
                equals: common_1.equals,
                pattern: /[^/]*/
            },
            any: {
                encode: common_1.identity,
                decode: common_1.identity,
                equals: common_1.equals,
                pattern: /.*/
            }
        };
        var makeType = function (definition, name) { return new type_1.Type(common_1.extend({ name: name }, definition)); };
        this.types = common_1.inherit(common_1.map(this.defaultTypes, makeType), {});
    }
    ParamTypes.prototype.type = function (name, definition, definitionFn) {
        if (!common_1.isDefined(definition))
            return this.types[name];
        if (this.types.hasOwnProperty(name))
            throw new Error("A type named '" + name + "' has already been defined.");
        this.types[name] = new type_1.Type(common_1.extend({ name: name }, definition));
        if (definitionFn) {
            this.typeQueue.push({ name: name, def: definitionFn });
            if (!this.enqueue)
                this._flushTypeQueue();
        }
        return this;
    };
    ParamTypes.prototype._flushTypeQueue = function () {
        while (this.typeQueue.length) {
            var type = this.typeQueue.shift();
            if (type.pattern)
                throw new Error("You cannot override a type's .pattern at runtime.");
            common_1.extend(this.types[type.name], coreservices_1.services.$injector.invoke(type.def));
        }
    };
    return ParamTypes;
})();
exports.paramTypes = new ParamTypes();
//# sourceMappingURL=paramTypes.js.map