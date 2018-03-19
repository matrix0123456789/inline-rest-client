const startingConfig = {
    defaultMethod: 'get',
    parameterType: 'query',
    url: '/',
    urlBuilder: function (baseUrl, path) {
        if (baseUrl.substr(-1) != '/')
            baseUrl += '/';
        return baseUrl + path.join('/');
    }
};
function ResposeodeException(status, statusText, content) {
    this.status = status;
    this.statusText = statusText;
    this.content = content;
}
const factoryHandler = {
    apply(target, args) {
        return this.construct(target, args);

    },
    construct(target, args) {
        var config = Object.assign({}, startingConfig);
        if (args[0])
            config = Object.assign(config, args[0]);
        var runFun = run.bind(config, null);
        for (var x in startingConfig) {
            runFun[x] = startingConfig[x];
        }
        if (args[0])
            for (var x in args[0]) {
                runFun[x] = args[0][x];
            }
        runFun.__path = [];
        var ret = new Proxy(runFun, clientProtoHandler);
        return ret;
    }
}
function buildParametersQueryPart(obj, arr = [], prefix = '') {
    if (typeof obj == 'object')
        for (var x in obj) {
            if (prefix == '')
                buildParametersQueryPart(obj[x], arr, x);
            else
                buildParametersQueryPart(obj[x], arr, prefix + '[' + x + ']');
        }
    else
        arr.push(prefix + '=' + encodeURI(obj))
}
function buildParametersQuery(url, parameters) {
    for (var parameter of parameters) {

        var parametersArray = [];
        buildParametersQueryPart(parameter, parametersArray);
        if (parametersArray.length == 0)
            continue;
        if (url.indexOf('?') >= 0)
            url += '&';
        else
            url += '?';

        url += parametersArray.join('&');
    }
    return url;
}
function buildParametersPath(url, parameters) {
    for (var parameter of parameters) {
        if (typeof parameter == 'object') {
            for (var x in parameter) {
                url += '/' + encodeURI(x) + '/' + encodeURI(parameter[x]);
            }
        } else
            url += '/' + encodeURI(parameter)
    }
    return url;
}

function run(nodeName) {
    for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        parameters[_key - 1] = arguments[_key];
    }
    var method = this.defaultMethod;
    var path = this.__path.slice();
    if (nodeName == 'post' || nodeName == 'get' || nodeName == 'put' || nodeName == 'patch' || nodeName == 'delete') {
        method = nodeName;
    } else {
        path.push(nodeName);
    }

    return new Promise((resolve, reject) => {
        var url = this.urlBuilder(this.url, path);
        if (this.parameterType == 'query')
        {
            url = buildParametersQuery(url, parameters);
        } else if (this.parameterType == 'path')
        {
            url = buildParametersPath(url, parameters);
        } else {
            new Error('Unknown parameter type');
        }
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.onload = e => {
            var toResolve;
            var mime = e.target.getResponseHeader('content-type');
            if (mime && mime.indexOf('json') >= 0)
                try {
                    toResolve = JSON.parse(e.target.responseText)
                } catch (e) {
                    reject(e)
                    return;
                }
            else
                toResolve = e.target.responseText;

            if (e.target.status == 200) {
                resolve(toResolve);
            } else {

                reject(new ResposeodeException(e.target.status, e.target.statusText, toResolve));
            }
        };
        xhr.onerror = e => reject(new Error('Connection error'));
        xhr.send();
    });
}
const factory = new Proxy(function () {}
, factoryHandler);
const clientProtoHandler = {
    get(target, nodeName, client) {
        var runFun = run.bind(target, nodeName);

        for (var x in target) {
            runFun[x] = target[x];
        }

        if (target.__path)
            var path = target.__path.slice();
        else
            var path = [];
        path.push(nodeName);

        runFun.__path = path;
        var ret = new Proxy(runFun, clientProtoHandler);
        return ret;
    }
}
export default factory;