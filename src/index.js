const startingConfig = {
    defaultMethod: 'get',
    parameterType: 'query',
    responseType:'auto',
    url: '/',
    headers: {},
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
    __clone: function (params={}) {
        const ret={};
        Object.setPrototypeOf(ret, this)
        Object.assign(ret, params);
        return ret;
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

async function run(nodeName) {
    for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        parameters[_key - 1] = arguments[_key];
    }
    console.log({parameters, arguments})
    var method = this.defaultMethod;
    var path = this.__path.slice();
    if (nodeName == 'post' || nodeName == 'get' || nodeName == 'put' || nodeName == 'patch' || nodeName == 'delete') {
        method = nodeName;
    } else {
        path.push(nodeName);
    }

    var url = this.urlBuilder(this.url, path);
    var fetchConfig = {method, headers: this.headers}
    if (this.parameterType == 'query') {
        url = buildParametersQuery(url, parameters);
    } else if (this.parameterType == 'path') {
        url = buildParametersPath(url, parameters);
    } else if (this.parameterType == 'json') {
        fetchConfig.body = JSON.stringify(parameters[0] ?? null);
    } else if (this.parameterType == 'multipart') {
        fetchConfig.body = new FormData();
        for (const parameter of parameters) {
            for (const [key, value] of Object.entries(parameter)) {
                fetchConfig.body.append(key, value);
            }
        }
    } else if (this.parameterType == 'multipartJson') {
        fetchConfig.body = new FormData();
        let i = 0;
        for (const parameter of parameters) {
            fetchConfig.body.append(i, JSON.stringify(parameter));
            i++;
        }
    } else {
        new Error('Unknown parameter type');
    }
    if (this.parameterType == 'json') {
        fetchConfig.headers['content-type'] = 'application/json'
    } else if (this.parameterType == 'multipart') {
        //fetchConfig.headers['content-type'] = 'multipart/form-data'
    }
    if (this.withCredentials) {
        fetchConfig.credentials = 'include'
    }

    let response = await fetch(url, fetchConfig)

    var toResolve;
    if(this.responseType=='auto') {
        var mime = response.headers.get('content-type');
        if (mime && mime.indexOf('json') >= 0)
            toResolve = await response.json()
        else
            toResolve = await response.text()
    }else if(this.responseType=='json'){
        toResolve = await response.json()
    }else if(this.responseType=='text'){
        toResolve = await response.text()
    }else if(this.responseType=='blob'){
        toResolve = await response.blob()
    }

    if (response.status == 200) {
        return toResolve;
    } else if (response.status == 204) {
        return null;
    } else {
        throw new ResposeodeException(response.status, response.statusText, toResolve);
    }
}

const factory = new Proxy(function () {
    }
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
