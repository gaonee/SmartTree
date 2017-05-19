
/*
 * JQuery smartTree core v0.0.01
 *
 * Copyright (c) 2016 Jian.Ma
 *
 * Licensed same as jquery - MIT License
 * http://www.opensource.org/licenses/mit-license.php
 *
 * email: 18551750323@163.com
 * Begin date: 2016-09-22
 */

(function($) {
    var settings = {}, roots = {}, caches = {}, unfoldNodes = {}, displayNode = {},
    _consts = {
        className: {
            BUTTON: "button",
            LEVEL: "level",
            ICO_LOADING: "ico_loading",
            SWITCH: "switch",
            NAME: 'node_name'
        },
        event: {
            NODECREATED: "ztree_nodeCreated",
            CLICK: "ztree_click",
            EXPAND: "ztree_expand",
            COLLAPSE: "ztree_collapse",
            ASYNC_SUCCESS: "ztree_async_success",
            ASYNC_ERROR: "ztree_async_error",
            REMOVE: "ztree_remove",
            SELECTED: "ztree_selected",
            UNSELECTED: "ztree_unselected"
        },
        id: {
            A: "_a",
            ICON: "_ico",
            SPAN: "_span",
            SWITCH: "_switch",
            UL: "_ul",
            LI: "_li"
        },
        line: {
            ROOT: "root",
            ROOTS: "roots",
            CENTER: "center",
            BOTTOM: "bottom",
            NOLINE: "noline",
            LINE: "line"
        },
        folder: {
            OPEN: "open",
            CLOSE: "close",
            DOCU: "docu"
        },
        node: {
            CURSELECTED: "curSelectedNode",
            SEP: 10
        }
    },
    _setting = {
        treeId: "",
        treeObj: null,
        treeWrapObj: null,
        singleNodeHeight: 32,
        defaultOpenLevel: 1,
        view: {
            addDiyDom: null,
            addHoverDom: null,
            removeHoverDom: null,
            autoCancelSelected: true,
            dblClickExpand: true,
            divisionIconStatus: true,
            expandSpeed: "fast",
            fontCss: {},
            nameIsHTML: false,
            selectedMulti: true,
            showIcon: true,
            showLine: true,
            showTitle: true,
            txtSelectedEnable: false
        },
        data: {
            key: {
                children: "children",
                name: "displayName",
                title: "",
                url: "url",
                icon: "icon"
            },
            simpleData: {
                enable: false,
                idKey: "id",
                pIdKey: "pId",
                rootPId: null
            },
            keep: {
                parent: false,
                leaf: false,
                itemWidth: false
            }
        },
        node: {
            SEP: 10
        },
        async: {
            enable: false,
            contentType: "application/x-www-form-urlencoded",
            type: "post",
            dataType: "text",
            url: "",
            autoParam: [],
            otherParam: [],
            dataFilter: null
        },
        callback: {
            beforeAsync:null,
            beforeClick:null,
            beforeDblClick:null,
            beforeRightClick:null,
            beforeMouseDown:null,
            beforeMouseUp:null,
            beforeExpand:null,
            beforeCollapse:null,
            beforeRemove:null,
            beforeCreateNode:null,

            onAsyncError:null,
            onAsyncSuccess:null,
            onNodeCreated:null,
            onClick:null,
            onDblClick:null,
            onRightClick:null,
            onMouseDown:null,
            onMouseUp:null,
            onExpand:null,
            onCollapse:null,
            onRemove:null
        },
        advanced: {
            brunchSwitchOnly: true,
            dblClickSwitch: false,
            iconSkinClass: "button",
            getIconSkin: null,
            getName: null,
            getTitle: null
        }
    },
    _bindEvent = function(setting) {
        setting.treeObj.on("click." + setting.namespace, "[data-node]", function(e) {
            var node = data.getNodeCache(setting, this.id);
            
            view.focusChange(setting, node);

            if (!setting.advanced.dblClickSwitch) {
                view.switchTransform(setting, node);
            }

            tools.apply(setting.callback.onClick, [e, setting.treeId, node]);
        }).on("dblclick." + setting.namespace, "[data-node]", function(e) {
            var node = data.getNodeCache(setting, this.id);

            if (setting.advanced.dblClickSwitch) {
                view.switchTransform(setting, node);
            }

            tools.apply(setting.callback.onDblClick, [e, setting.treeId, node]);
        }).on("mouseenter." + setting.namespace, "[data-node]", function() {
            var node = data.getNodeCache(setting, this.id);

            /* when we use mouse wheel to scroll the tree, 
             * mouseenter event will not be triggered timely,
             * and mousedown event will be trigger first.
             */
            if (data.getFocusNode(setting) != node ||
                data.getHoverNode(setting) != node) {
                data.setHoverNode(setting, node);
                tools.apply(setting.view.addHoverDom, [setting.treeId, node]);
            }
        }).on("mouseleave." + setting.namespace, "[data-node]", function(e) {
            var node = data.getNodeCache(setting, this.id);

            if (data.getFocusNode(setting) != node) {
                tools.apply(setting.view.removeHoverDom, [setting.treeId, node]);
            }
        });
    },
    _unbindEvent = function(setting) {
        setting.treeObj.off("click." + setting.namespace, "[data-node]")
        .off("dblclick." + setting.namespace, "[data-node]")
        .off("mouseenter." + setting.namespace, "[data-node]")
        .off("mouseleave." + setting.namespace, "[data-node]");
    },
    _init = {
        bind: [_bindEvent],
        unbind: [_unbindEvent]
    },
    tools = {
        apply: function(fun, param, defaultValue) {
            if ((typeof fun) == "function") {
                return fun.apply("", param?param:[]);
            }
            return defaultValue;
        },
        canAsync: function(setting, node) {
            var childKey = setting.data.key.children;
            return (setting.async.enable && node && node.isParent && !(node.zAsync || (node[childKey] && node[childKey].length > 0)));
        },
        clone: function (obj){
            if (obj === null) return null;
            var o = tools.isArray(obj) ? [] : {};
            for(var i in obj){
                o[i] = (obj[i] instanceof Date) ? new Date(obj[i].getTime()) : (typeof obj[i] === "object" ? tools.clone(obj[i]) : obj[i]);
            }
            return o;
        },
        copy: function(dst, src) {
            for (var k in src) {
                if (src.hasOwnProperty(k)) {
                    dst[k] = src[k];
                }
            }
        },
        eqs: function(str1, str2) {
            return str1.toLowerCase() === str2.toLowerCase();
        },
        isArray: function(arr) {
            return Object.prototype.toString.apply(arr) === "[object Array]";
        },
        $: function(node, exp, setting) {
            if (!!exp && typeof exp != "string") {
                setting = exp;
                exp = "";
            }
            if (typeof node == "string") {
                return $(node, setting ? setting.treeObj.get(0).ownerDocument : null);
            } else {
                return $("#" + node.tId + exp, setting ? setting.treeObj : null);
            }
        },
        getMDom: function (setting, curDom, targetExpr) {
            if (!curDom) return null;
            while (curDom && curDom.id !== setting.treeId) {
                for (var i=0, l=targetExpr.length; curDom.tagName && i<l; i++) {
                    if (tools.eqs(curDom.tagName, targetExpr[i].tagName) && curDom.getAttribute(targetExpr[i].attrName) !== null) {
                        return curDom;
                    }
                }
                curDom = curDom.parentNode;
            }
            return null;
        },
        getNodeMainDom:function(target) {
            return ($(target).parent("li").get(0) || $(target).parentsUntil("li").parent().get(0));
        },
        isChildOrSelf: function(dom, parentId) {
            return ( $(dom).closest("#" + parentId).length> 0 );
        },
        uCanDo: function(setting, e) {
            return true;
        },
        extend: function(c, p, opt) {
            var k = null, o = c.constructor.prototype, r = {};

            for (k in o) {
                r[k] = true;
            }
            for (k in p.prototype) {
                if (!r[k]) {
                    o[k] = p.prototype[k];
                }
            }
            p.apply(c, opt);
        },
        isSettingTrue: function(setting, node, settingCondition) {
            return tools.apply(settingCondition, [setting.treeId, node], settingCondition);
        },
        offset: function(ele) {
            var top = ele.offsetTop;
            var left = ele.offsetLeft;
            while (ele.offsetParent) {
                ele = ele.offsetParent;
                if (window.navigator.userAgent.indexOf('MSTE 8') > -1) {
                    top += ele.offsetTop;
                    left += ele.offsetLeft;
                } else {
                    top += ele.offsetTop + ele.clientTop;
                    left += ele.offsetLeft + ele.clientLeft;
                }
            }
            return {
                left: left,
                top: top
            }
        }
    },
    data = {
        addInitBind: function(bindEvent) {
            _init.bind.push(bindEvent);
        },
        addInitUnBind: function(unbindEvent) {
            _init.unbind.push(unbindEvent);
        },
        addNodesData: function(setting, parentNode, index, nodes) {
            var childKey = setting.data.key.children, params;

            if (index < 0) {
                parentNode[childKey] = parentNode[childKey].concat(nodes);
            } else {
                params = [index, 0].concat(nodes);
                parentNode[childKey].splice.apply(parentNode[childKey], params);
            }

            for (var i = 0,l = nodes.length; i < l; i++) {
                nodes[i].pId = parentNode.id;
                data.initNode(setting, parentNode, nodes[i], parentNode.level + 1);
            }
        },
        exSetting: function(s) {
            $.extend(true, _setting, s);
        },
        filterTreeNodes: function(setting, condition, expandFlag) {
            var collection = [];
            data.queryNodes(setting, condition, function(node, flag) {
                var childKey = setting.data.key.children;
                var parentNode = (node.parentTId) ? data.getNodeCache(setting, node.parentTId) : data.getRoot(setting);
                var l = parentNode[childKey].length;
                parentNode.hiddenNodes = parentNode.hiddenNodes || 0;
                if (!flag) { /*filtered*/
                    parentNode.hiddenNodes += (node.filtered || node.hidden) ? 0 : 1;
                    node.filtered = true;
                } else {
                    parentNode.hiddenNodes -= (node.filtered || node.hidden) ? 1 : 0;
                    node.filtered = false;

                    node.displayIndex = collection.length;
                    node.top = collection.length * setting.singleNodeHeight;
                    collection.push(node);
                }
                /* set hidden false when filter again */
                node.hidden = false;

                if (expandFlag != undefined) {
                    if (expandFlag && (node.collapse == expandFlag)) {
                        view.setNodeExpandState(setting, node, expandFlag);
                    }
                }

                /* recreate tree node when the node translate between brunch and leaf */
                if (parentNode[childKey][l-1] == node) {
                    if (parentNode.hiddenNodes == l &&
                        !setting.data.keep.parent) {
                        parentNode.isParent = false;
                        parentNode.treeNode = view.createNode(setting, parentNode);
                    } else {
                        if (!parentNode.isParent) {
                            parentNode.isParent = true;
                            parentNode.treeNode = view.createNode(setting, parentNode)
                        }
                    }
                }
            });
            data.setUnfolderNodes(setting, collection);
        },
        getCache: function(setting) {
            return caches[setting.treeId];
        },
        getRoot: function(setting) {
            if (!setting) return;
            return roots[setting.treeId] ? roots[setting.treeId] : null;
        },
        getSetting: function(treeId) {
            return settings[treeId];
        },
        getTreeTools: function(treeId) {
            var r = this.getRoot(this.getSetting(treeId));
            return r ? r.treeTools : null;
        },
        getWrapHeight: function(setting) {
            var displayNum = unfoldNodes[setting.treeId].length;
            return setting.singleNodeHeight * displayNum;
        },
        /* just get unfold nodes */
        getUnfoldNodes: function(setting) {
            data.queryAndExpandUnfoldNodes(setting, function(node) {
                return !node.collapse;
            });
        },
        getDisplayNodes: function(setting) {
            var startNode = 0, endNode = 0;
            var unfoldNode = unfoldNodes[setting.treeId];
            var rect = setting.treeObj[0].getBoundingClientRect();
            var wrapRect = setting.treeWrapObj[0].getBoundingClientRect();

            if (data.getWrapHeight(setting) <= rect.height) {
                startNode = 0;
            } else {
                startNode = Math.abs(Math.floor((wrapRect.top-rect.top) / setting.singleNodeHeight)) - 1;
            }
            startNode = startNode >= 0 ? startNode : 0;
            endNode = Math.ceil(rect.height / setting.singleNodeHeight) + startNode + 1;
            endNode = endNode >= unfoldNode.length ? unfoldNode.length-1 : endNode;
            displayNode[setting.treeId] = [startNode, endNode];
        },
        getNodes: function(setting) {
            return data.getRoot(setting)[setting.data.key.children];
        },
        getNodeByParam: function(setting, nodes, key, value) {
            if (!nodes || !key) return null;
            var childKey = setting.data.key.children;
            for (var i = 0, l = nodes.length; i < l; i++) {
                if (nodes[i][key] == value) {
                    return nodes[i];
                }
                var tmp = data.getNodeByParam(setting, nodes[i][childKey], key, value);
                if (tmp) return tmp;
            }
            return null;
        },
        getNodeName: function(setting, node) {
            var name = node.name || node.displayName || node.id;
            return tools.apply(setting.advanced.getName, [setting.treeId, node], name);
        },
        getNodeIconSkinClass: function(setting, node) {
            var iconSkin = setting.advanced.getIconSkin;
            var iconSkinClass = node.iconSkin ? node.iconSkin : (iconSkin ? (tools.apply(iconSkin, [setting.treeId, node], iconSkin)) : "");
            var suffix = data.getNodeIconSkinClassSuffix(setting, node);
            if (iconSkinClass && suffix) {
                iconSkinClass += "_";
            }
            iconSkinClass = (iconSkinClass + suffix) || "ico_docu";
            return iconSkinClass;
        },
        getNodeIconSkinClassSuffix: function(setting, node) {
            var suffix = "ico_";
            if (!setting.view.divisionIconStatus) {
                return "";
            }
            if (node.isParent) {
                suffix += (node.collapse ? consts.folder.CLOSE : consts.folder.OPEN);
            } else {
                suffix += consts.folder.DOCU;
            }
            return suffix;
        },
        getNodeCache: function(setting, tId) {
            return caches[setting.treeId].nodes[tId];
        },
        getFocusNode: function(setting) {
            return caches[setting.treeId].focusNode;
        },
        getHoverNode: function(setting) {
            return caches[setting.treeId].hoverNode;
        },
        initRoot: function(setting) {
            var node = {};
            node.id = setting.treeId;
            node.zId = 0;

            roots[setting.treeId] = node;
        },
        /*wrap the tree for scroll
         */
        initWrap: function(setting) {
            var r = roots[setting.treeId];
            var wrap = $("<ul class='ztree-wrap ztree'>");
            setting.treeObj.append(wrap);
            setting.treeWrapObj = wrap;
            setting.treeWrapWidth = setting.treeWrapObj[0].offsetWidth;

            view.updateWrapHeight(setting);
            view.initScrollBar(setting);
        },
        initCache: function(setting) {
            caches[setting.treeId] = {
                nodes: {},
                focusNode: null,
                hoverNode: null
            }
        },
        initNode: function(setting, parent, node, level) {
            var r = data.getRoot(setting);
            var childKey = setting.data.key.children;

            node.tId = setting.treeId + "_" + (++r.zId);
            node.parentTId = parent.tId;
            node.level = level || 0;

            if (node[childKey] && node[childKey].length > 0) {
                node.isParent = true;
                node.collapse = (node.level > setting.defaultOpenLevel) ? true : false;

                for (var i = 0,l = node[childKey].length; i < l; i++) {
                    data.initNode(setting, node, node[childKey][i], level + 1);
                }
            } else {
                node.isParent = false;
                if (!setting.advanced.brunchSwitchOnly) {
                    node.collapse = (node.level > setting.defaultOpenLevel) ? true : false;
                }
            }

            data.insertCacheNode(setting, node);
        },
        insertCacheNode: function(setting, node) {
            var cache = caches[setting.treeId];
            cache.nodes[node.tId] = node;
        },
        prepareData: function(setting) {
            var nodes = data.getRoot(setting);
            var childKey = setting.data.key.children;

            for (var i = 0, l = nodes[childKey].length; i < l; i++) {
                data.initNode(setting, nodes, nodes[childKey][i], 0);
            }
        },
        queryAndExpandUnfoldNodes: function(setting, condition) {
            var collection = [];

            data.queryNodes(setting, condition, function(node, flag) {
                if (node.hidden || node.filtered) {
                    return;
                }
                node.displayIndex = collection.length;
                node.top = collection.length * setting.singleNodeHeight;
                collection.push(node);
                if (node.collapse == flag) {
                    view.setNodeExpandState(setting, node, flag);
                }
            });
            unfoldNodes[setting.treeId] = collection;
        },
        /* get unfold nodes with condition */
        queryNodes: function(setting, condition, onprocess) {
            var nodes = data.getRoot(setting);
            var childKey = setting.data.key.children;

            for (var i = 0, l = nodes[childKey].length; i < l; i++) {
                data.queryNode(setting, nodes[childKey][i], condition, onprocess);
            }
        },
        queryNode: function(setting, node, condition, onprocess) {
            var childKey = setting.data.key.children;
            var cn = node[childKey];
            var flag = true;

            flag = tools.apply(condition, [node], condition);

            tools.apply(onprocess, [node, flag]);

            if (flag) {
                if(cn && cn.length > 0) {
                    for (var i = 0,l = cn.length; i < l; i++) {
                        data.queryNode(setting, cn[i], condition, onprocess);
                    }
                }
            }
        },
        removeNodeCache: function(setting, node) {
            var childKey = setting.data.key.children;
            if (node[childKey]) {
                for (var i=0, l=node[childKey].length; i<l; i++) {
                    data.removeNodeCache(setting, node[childKey][i]);
                }
            }
            data.getCache(setting).nodes[node.tId] = null;
        },
        resetRoot: function(setting) {
            var root = data.getRoot(setting);
            root.children = [];
            root.zId = 0;
        },
        searchTreeNodes: function(setting, condition, expandFlag, maxCount, maxCountCallback) {
            var collection = [];
            data.queryNodes(setting, function(node) {
                if (node.filtered) {
                    return false;
                } else {
                    return tools.apply(condition, [node], condition);
                }
            }, function(node, flag) {
                var childKey = setting.data.key.children;
                var parentNode = (node.parentTId) ? data.getNodeCache(setting, node.parentTId) : data.getRoot(setting);
                var l = parentNode[childKey].length;
                parentNode.hiddenNodes = parentNode.hiddenNodes || 0;
                if (!flag) {
                    parentNode.hiddenNodes += node.hidden || node.filtered ? 0 : 1;
                    node.hidden = true;
                } else {
                    parentNode.hiddenNodes -= node.hidden || node.filtered ? 1 : 0;
                    node.hidden = false;

                    node.displayIndex = collection.length;
                    node.top = collection.length * setting.singleNodeHeight;
                    collection.push(node);
                }

                if (expandFlag != undefined) {
                    if (expandFlag && (node.collapse == expandFlag)) {
                        view.setNodeExpandState(setting, node, expandFlag);
                    }
                }

                if (parentNode[childKey][l-1] == node) {
                    if (parentNode.hiddenNodes == l &&
                        !setting.data.keep.parent) {
                        parentNode.isParent = false;
                        parentNode.treeNode = view.createNode(setting, parentNode);
                    } else {
                        if (!parentNode.isParent) {
                            parentNode.isParent = true;
                            parentNode.treeNode = view.createNode(setting, parentNode)
                        }
                    }
                }
            });
            if (collection.length > maxCount) {
                tools.apply(maxCountCallback, []);
            }
            data.setUnfolderNodes(setting, collection);
        },
        setFocusNode: function(setting, node) {
            caches[setting.treeId].focusNode = node;
        },
        setHoverNode: function(setting, node) {
            caches[setting.treeId].hoverNode = node;
        },
        setUnfolderNodes: function(setting, nodes) {
            unfoldNodes[setting.treeId] = nodes;
        },
        transformToArrayFormat: function (setting, nodes) {
            if (!nodes) return [];
            var childKey = setting.data.key.children,
            r = [];
            if (tools.isArray(nodes)) {
                for (var i=0, l=nodes.length; i<l; i++) {
                    r.push(nodes[i]);
                    if (nodes[i][childKey])
                        r = r.concat(data.transformToArrayFormat(setting, nodes[i][childKey]));
                }
            } else {
                r.push(nodes);
                if (nodes[childKey])
                    r = r.concat(data.transformToArrayFormat(setting, nodes[childKey]));
            }
            return r;
        },
        transformTozTreeFormat: function(setting, nodes) {
            var i,l,
            key = setting.data.simpleData.idKey,
            parentKey = setting.data.simpleData.pIdKey,
            childKey = setting.data.key.children;
            if (!key || key=="" || !nodes) return [];

            if (tools.isArray(nodes)) {
                var r = [];
                var tmpMap = {};
                for (i=0, l=nodes.length; i<l; i++) {
                    tmpMap[nodes[i][key]] = nodes[i];
                }
                for (i=0, l=nodes.length; i<l; i++) {
                    if (tmpMap[nodes[i][parentKey]] && nodes[i][key] != nodes[i][parentKey]) {
                        if (!tmpMap[nodes[i][parentKey]][childKey]) {
                            tmpMap[nodes[i][parentKey]][childKey] = [];
                        }
                        tmpMap[nodes[i][parentKey]][childKey].push(nodes[i]);
                    } else {
                        r.push(nodes[i]);
                    }
                }
                return r;
            }else {
                return [nodes];
            }
        }
    },
    view = {
        addNodes: function(setting, parentNode, index, newNodes, isSilent) {
            if (parentNode && !parentNode.isParent && setting.data.keep.leaf) {
                return;
            }
            if (!tools.isArray(newNodes)) {
                newNodes = [newNodes];
            }
            if (setting.data.simpleData.enable) {
                newNodes = data.transformTozTreeFormat(setting, newNodes);
            }

            if (parentNode) {
                if (!isSilent) {
                    parentNode.collapse = false;
                }
            } else {
                parentNode = data.getRoot(setting);
            }
            data.addNodesData(setting, parentNode, index, newNodes);
            view.updateUnfoldNodes(setting);
        },
        collapse: function(setting, node) {
            node.collapse = true;
            node.treeNode = node.treeNode || view.createNode(setting, node);
            node.treeNode.find(".icon-switch-out").removeClass("select-open").addClass("select-close");
        },
        createNode: function(setting, node) {
            tools.apply(setting.callback.beforeCreateNode, [setting.treeId, node]);
            if (node.isParent) {
                return view.genBrunchNode(setting, node);
            } else {
                return view.genLeafNode(setting, node);
            }
        },
        destroy: function(setting) {
            if (!setting) return;
            view.destroyScrollBar(setting);
            setting.treeObj.empty();
            delete settings[setting.treeId];
        },
        /* expend nodes by flag */
        expandAll: function(setting, expandFlag) {
            data.queryAndExpandUnfoldNodes(setting, expandFlag);
            view.updateWrapHeight(setting);
            view.updateDisplayNodes(setting);
        },
        expandNode: function(setting, node, expandFlag, sonSign, focus, callbackFlag) {
            if (node.isParent || !setting.advanced.brunchSwitchOnly) {
                view.setNodeExpandState(setting, node, expandFlag);
                view.updateUnfoldNodes(setting);
            }
        },
        focusChange: function(setting, node) {
            var focusNode = data.getFocusNode(setting);

            // invalid node
            if (!node.treeNode) {
                return;
            }

            if (focusNode == undefined ||
                focusNode == -1 ||
                !focusNode.treeNode) {

                node.treeNode.addClass("focus");
                data.setFocusNode(setting, node);
            } else {
                if (focusNode != node) {
                    focusNode.treeNode.removeClass("focus");
                    tools.apply(setting.view.removeHoverDom, [setting.treeId, focusNode]);
                    node.treeNode.addClass("focus");
                    data.setFocusNode(setting, node);
                } else {
                    node.treeNode.addClass("focus");
                }
            }
        },
        filterTreeNodes: function(setting, condition, expandFlag, scrollToTopFlag) {
            data.filterTreeNodes(setting, condition, expandFlag);
            view.updateVisibleArea(setting);
            if (scrollToTopFlag) {
                view.scrollToTop(setting);
            }
        },
        genBrunchNode: function(setting, node) {
            var nodeStr = "<li " + view.genNodeContainer(setting, node) + ">" +
            view.genSwitchIcon(setting, node) +
            view.genNodeContent(setting, node) +
            "</li>";

            return $(nodeStr);
        },
        genLeafNode: function(setting, node) {
            var nodeStr = "<li " + view.genNodeContainer(setting, node) + ">" +
            (setting.advanced.brunchSwitchOnly ? "" : view.genSwitchIcon(setting, node)) +
            view.genNodeContent(setting, node) +
            "</li>";

            return $(nodeStr);
        },
        genNodeContainer: function(setting, node) {
            var paddingLeft = (node.level + 1) * setting.node.SEP;
            var style = "top:" + node.top + "px;padding-left:" + paddingLeft + "px;line-height:" + setting.singleNodeHeight + "px;height:" + setting.singleNodeHeight + "px;";

            return "data-node id='" + node.tId + "' tabindex='0' style='" + style + "' class='ztree-node ellipsis' treenode=''";
        },
        genSwitchIcon: function(setting, node) {
            var switchStatusClass = node.collapse ? "select-close" : "select-open";
            return "<a class='tree-node-switch'><span class='icon-switch-out " + switchStatusClass + "'></span></a>";
        },
        genNodeContent: function(setting, node) {
            var contentStr = "<a class='tree-node-content ellipsis'>" +
            (tools.isSettingTrue(setting, node, setting.view.showIcon) ? view.genNodeIconSkin(setting, node) : "") +
            view.genNodeContentName(setting, node) +
            "</a>";
            return contentStr;
        },
        genNodeIconSkin: function(setting, node) {
            return "<span data-iconskin class='" + setting.advanced.iconSkinClass + " " + data.getNodeIconSkinClass(setting, node) + "'></span>";
        },
        genNodeContentName: function(setting, node) {
            var name = data.getNodeName(setting, node);
            var title = null;

            if (tools.isSettingTrue(setting, node, setting.view.showTitle)) {
                title = node.title || tools.apply(setting.advanced.getTitle, [setting.treeId, node], name);
            }

            return "<span title='" + (title?title:'') + "' class='ztree-node-name'>" + name + "</span>";
        },
        renderDisplayNode: function(setting) {
            var unfoldNode = unfoldNodes[setting.treeId];
            var displayNd = displayNode[setting.treeId];
            var displayObj = null;
            /**
             * create tree node element when it is going to display
             */
            for (var i = displayNd[0]; i <= displayNd[1]; i++) {
                var node = unfoldNode[i];
                if (node.treeNode) {
                    node.treeNode.css("top", node.top + "px");
                } else {
                    node.treeNode = view.createNode(setting, node);
                }
                displayObj = displayObj ? displayObj.add(node.treeNode) : node.treeNode;
            }
            setting.treeWrapObj.empty().append(displayObj);
        },
        removeNode: function(setting, node) {
            var root = data.getRoot(setting),
            childKey = setting.data.key.children,
            parentNode = (node.parentTId) ? data.getNodeCache(setting, node.parentTId) : root;

            if (!data.getNodeCache(setting, node.tId)) {
                return;
            }

            /*remove if node has render*/
            if (node.treeNode) {
                node.treeNode.remove();
                node.treeNode = null;
            }

            /*remove cache*/
            data.removeNodeCache(setting, node);

            for (var i = 0, l = parentNode[childKey].length; i < l; i++) {
                if (parentNode[childKey][i].tId == node.tId) {
                    parentNode[childKey].splice(i, 1);
                    break;
                }
            }

            /*repair parend node*/
            if (parentNode[childKey].length <= 0) {
                parentNode.isParent = false;
                parentNode.treeNode = null;
            }

            view.updateUnfoldNodes(setting);
        },
        switchTransform: function(setting, node) {
            view.expandNode(setting, node, node.collapse);
            setting.treeObj.stScrollbar("update");
        },
        setNodeName: function(setting, node) {
            var name = data.getNodeName(setting, node);
            /* ignore if node never create */
            if (node.treeNode) {
                node.treeNode.find(".ztree-node-name").text(name);
            }
        },
        setNodeTitle: function(setting, node) {
            var title = node.title || tools.apply(setting.advanced.getTitle, [setting.treeId, node]);
            
            if (node.treeNode) {
                node.treeNode.find(".ztree-node-name")[0].title = title;
            }
        },
        setIconSkin: function(setting, node) {
            var $iconSkin = node.treeNode.find("[data-iconskin]");
            var classNames = $iconSkin[0].className.split(' ');

            if (!node.treeNode) {
                return;
            }
            
            for (var i = 0,l = classNames.length; i < l; i++) {
                if (classNames[i] != setting.advanced.iconSkinClass) {
                    $iconSkin.removeClass(classNames[i]);
                }
            }
            $iconSkin.addClass(data.getNodeIconSkinClass(setting, node));
        },
        setNodeExpandState: function(setting, node, expandFlag) {
            if (expandFlag == node.collapse) {
                var oldIconSkin = data.getNodeIconSkinClass(setting, node);
                if (expandFlag) {
                    view.unfold(setting, node);
                } else {
                    view.collapse(setting, node);
                }
                node.treeNode.find("[data-iconskin]").removeClass(oldIconSkin).addClass(data.getNodeIconSkinClass(setting, node));
            }
        },
        scrollToTop: function(setting) {
            setting.treeObj.stScrollbar("scrollTo", "top");
        },
        searchTreeNodes: function(setting, condition, expandFlag, scrollToTopFlag, maxCount, maxCountCallback) {
            data.searchTreeNodes(setting, condition, expandFlag, maxCount, maxCountCallback);
            view.updateVisibleArea(setting);
            if (scrollToTopFlag) {
                view.scrollToTop(setting);
            }
        },
        /* Change unfold list & refresh */
        updateUnfoldNodes: function(setting) {
            data.getUnfoldNodes(setting);
            view.updateVisibleArea(setting);
        },
        updateVisibleArea: function(setting) {
            view.updateWrapHeight(setting);
            view.updateDisplayNodes(setting);
        },
        updateWrapHeight: function(setting) {
            setting.treeWrapObj.css("height", data.getWrapHeight(setting));
        },
        /* Just update existing tree node list */
        updateDisplayNodes: function(setting) {
            data.getDisplayNodes(setting);
            view.renderDisplayNode(setting);
        },
        updateNode: function(setting, node) {
            if (!node) return;
            if (node.treeNode) {
                view.setNodeName(setting, node);
                view.setNodeTitle(setting, node);
                view.setIconSkin(setting, node);
            }
        },
        /* update all tree nodes with param */
        updateTreeNodes: function(setting, nodes) {
            /* reset data */
            data.resetRoot(setting);
            data.initCache(setting);

            var root = data.getRoot(setting);
            var childKey = setting.data.key.children;
            var cloneNodes = nodes ? $.extend(true, [], tools.isArray(nodes)? nodes : [nodes]) : [];
            if (setting.data.simpleData.enable) {
                root[childKey] = data.transformTozTreeFormat(setting, cloneNodes);
            } else {
                root[childKey] = cloneNodes;
            }

            data.prepareData(setting);
            data.getUnfoldNodes(setting);
            data.getDisplayNodes(setting);

            view.updateUnfoldNodes(setting);
            view.renderDisplayNode(setting);
            view.scrollToTop(setting);
        },
        unfold: function(setting, node) {
            node.collapse = false;
            node.treeNode = node.treeNode || view.createNode(setting, node);
            node.treeNode.find(".icon-switch-out").removeClass("select-close").addClass("select-open");
        },
        destroyScrollBar: function(setting) {
            setting.treeObj.stScrollbar("destroy");
        },
        initScrollBar: function(setting) {
            var mask = $("<div class='ztree-mask' style='position:absolute;left:0;top:0;width:100%;height:100%;display:none;cursor:pointer'>");
            setting.treeWrapObj.parent().append(mask);
            setting.treeObj.stScrollbar({
                id: setting.treeId,
                theme: "smartTree",
                axis: "y",
                scrollInertia: 0,
                mouseWheel: {
                    scrollAmount: setting.singleNodeHeight * 3
                },
                scrollButtons: {
                    enable: true,
                    scrollSpeed: setting.singleNodeHeight,
                    scrollAmount: setting.singleNodeHeight
                },
                callbacks: {
                    onScrollStart: function() {
                        var hoverNode = data.getHoverNode(setting);
                        mask.show();
                        if (hoverNode && data.getFocusNode(setting) != hoverNode) {
                            tools.apply(setting.view.removeHoverDom, [setting.treeId, hoverNode]);
                        }
                    },
                    onScroll: function() {
                        mask.hide();
                    },
                    onShow: function() {
                        view.updateUnfoldNodes(setting);
                    },
                    whileScrolling: function(e) {
                        view.updateDisplayNodes(setting);
                    },
                    whileScrollingInterval: 30
                }
            });
        }
    },
    event = {
        bindEvent: function(setting) {
            for (var i=0, j=_init.bind.length; i<j; i++) {
                _init.bind[i].apply(this, arguments);
            }
        },
        unbindEvent: function(setting) {
            for (var i=0, j=_init.unbind.length; i<j; i++) {
                _init.unbind[i].apply(this, arguments);
            }
        }
    };

    $.fn.smartTree = {
        consts : _consts,
        _z : {
            tools: tools,
            view: view,
            event: event,
            data: data
        },
        getZTreeObj: function(treeId) {
            var o = data.getTreeTools(treeId);
            return o ? o : null;
        },
        destroy: function(treeId) {
            if (!!treeId && treeId.length > 0) {
                view.destroy(data.getSetting(treeId));
            } else {
                for(var s in settings) {
                    view.destroy(settings[s]);
                }
            }
        },
        init: function(obj, fSetting, fNodes) {
            var setting = tools.clone(_setting);
            var treeId = obj.attr("id");
            $.extend(true, setting, fSetting);

            if (settings[treeId]) {
                view.destroy(settings[treeId]);
            }

            setting.namespace = "st_" + treeId;
            setting.treeId = treeId;
            setting.treeObj = obj;
            setting.treeObj.empty();
            settings[setting.treeId] = setting;

            data.initRoot(setting);
            data.initCache(setting);
            var root = data.getRoot(setting);
            var childKey = setting.data.key.children;
            var cloneNodes = fNodes ? $.extend(true, [], tools.isArray(fNodes)? fNodes : [fNodes]) : [];
            if (setting.data.simpleData.enable) {
                root[childKey] = data.transformTozTreeFormat(setting, cloneNodes);
            } else {
                root[childKey] = cloneNodes;
            }

            data.prepareData(setting);
            data.getUnfoldNodes(setting);
            data.initWrap(setting);

            view.updateDisplayNodes(setting);

            event.unbindEvent(setting);
            event.bindEvent(setting);

            var treeTools = {
                setting: setting,
                addNodes: function(parentNode, index, newNodes, isSilent) {
                    if (!parentNode) parentNode = null;

                    var i = parseInt(index, 10);
                    if (isNaN(i)) {
                        isSilent = !!newNodes;
                        newNodes = index;
                        index = -1;
                    } else {
                        index = i;
                    }
                    if (!newNodes) return null;

                    var xNewNodes = $.extend(true, {}, tools.isArray(newNodes)? newNodes: [newNodes]);
                    view.addNodes(setting, parentNode, index, newNodes, isSilent);
                    return xNewNodes;
                },
                expandNode: function(node, expandFlag, sonSign, focus, callbackFlag) {
                    view.expandNode(setting, node, expandFlag, sonSign, focus, callbackFlag);
                },
                expandAll: function(expandFlag) {
                    view.expandAll(setting, expandFlag);
                },
                filterTreeNodes: function(condition, expandFlag, scrollToTopFlag) {
                    view.filterTreeNodes(setting, condition, expandFlag, scrollToTopFlag);
                },
                getElementByNode: function(node) {
                    node.treeNode = node.treeNode || view.createNode(setting, node);
                    return node ? node.treeNode : null;
                },
                getNodeByTId: function(tId) {
                    return data.getNodeCache(setting, tId);
                },
                getNodeByParam: function(key, value, parentNode) {
                    if (!key) return null;
                    return data.getNodeByParam(setting, parentNode?parentNode[setting.data.key.children]:data.getNodes(setting), key, value);
                },
                getNodes: function() {
                    return data.getNodes(setting);
                },
                removeNode: function(node) {
                    if (!node) return;
                    view.removeNode(setting, node);
                },
                searchTreeNodes: function(condition, expandFlag, scrollToTopFlag, maxCount, maxCountCallback) {
                    view.searchTreeNodes(setting, condition, expandFlag, scrollToTopFlag, maxCount, maxCountCallback);
                },
                transformTozTreeNodes : function(simpleNodes) {
                    return data.transformTozTreeFormat(setting, simpleNodes);
                },
                transformToArray: function(nodes) {
                    return data.transformToArrayFormat(setting, nodes);
                },
                updateNode: function(node) {
                    view.updateNode(setting, node);
                },
                updateTreeNodes: function(nodes) {
                    view.updateTreeNodes(setting, nodes);
                }
            }
            root.treeTools = treeTools;
            return treeTools;
        }
    };

    var zt = $.fn.smartTree,
    consts = zt.consts;
})(jQuery);
/*
 * JQuery smartTree exedit v0.0.01
 *
 * Copyright (c) 2016 Jian.Ma
 *
 * Licensed same as jquery - MIT License
 * http://www.opensource.org/licenses/mit-license.php
 *
 * email: 18551750323@163.com
 * Begin date: 2016-10-13
 */
(function($) {
    //default consts of exedit
    var _consts = {
        event: {
            DRAG: "ztree_drag",
            DROP: "ztree_drop",
            RENAME: "ztree_rename",
            DRAGMOVE:"ztree_dragmove"
        },
        id: {
            EDIT: "_edit",
            INPUT: "_input",
            REMOVE: "_remove"
        },
        move: {
            TYPE_INNER: "inner",
            TYPE_PREV: "prev",
            TYPE_NEXT: "next"
        },
        node: {
            CURSELECTED_EDIT: "curSelectedNode_Edit",
            TMPTARGET_TREE: "tmpTargetzTree",
            TMPTARGET_NODE: "tmpTargetNode"
        }
    },
    //default setting of exedit
    _setting = {
        edit: {
            enable: false,
            editNameSelectAll: false,
            showRemoveBtn: true,
            showRenameBtn: true,
            removeTitle: "remove",
            renameTitle: "rename",
            drag: {
                autoExpandTrigger: false,
                isCopy: true,
                isMove: true,
                prev: true,
                next: true,
                inner: true,
                minMoveSize: 5,
                borderMax: 10,
                borderMin: -5,
                maxShowNodeNum: 5,
                autoOpenTime: 500,
                helper: null,
                cursor: "pointer",
                cursorAt: {
                    left: 0,
                    top: 0
                },
                opacity: 0.5,
                zIndex: 1
            }
        },
        view: {
            addHoverDom: null,
            removeHoverDom: null
        },
        callback: {
            beforeDrag:null,
            beforeDragOpen:null,
            beforeDrop:null,
            beforeEditName:null,
            beforeRename:null,
            onDrag:null,
            onDragMove:null,
            onDrop:null,
            onRename:null
        }
    },
    _treeTools = {

    },
    _tools = {},
    _data = {},
    _view = {
    },
    _bindEvent = function(setting) {
        var mouseDown = false,
        dragNode = null,
        dragFlag = 0,
        draggedElement = null,
        treeId = setting.treeId,
        mouseDownX = 0,
        mouseDownY = 0,
        movingFlag = false,
        doc = setting.treeObj.get(0).ownerDocument,
        body = setting.treeObj.get(0).ownerDocument.body;

        setting.treeObj.on("mousedown." + setting.namespace, "[data-node]", function(e) {
            var node = data.getNodeCache(setting, this.id);
            view.focusChange(setting, node);
            mouseDown = true;
            dragNode = node;
            mouseDownX = e.clientX;
            mouseDownY = e.clientY;
            $(doc).on("mousemove." + setting.namespace, _docMouseMove);
            $(doc).on("mouseup." + setting.namespace, _docMouseUp);
        });

        function _docMouseMove(e) {
            var t = $(this);
            if (!setting.edit.enable ||
                !setting.edit.drag.isMove ||
                !mouseDown ||
                e.buttons != 1 ||
                e.button == 2) {
                return true;
            }
            if (Math.abs(mouseDownX - e.clientX) < setting.edit.drag.minMoveSize &&
                Math.abs(mouseDownY - e.clientY) < setting.edit.drag.minMoveSize) {
                return true;
            }

            /* control moving interval */
            if (!movingFlag) {
                movingFlag = true;
                setTimeout(function() {
                    movingFlag = false;
                }, 20);
            } else {
                return true;
            }

            if (dragFlag == 0) {
                if (!tools.apply(setting.callback.beforeDrag, [treeId, [dragNode]], true)) {
                    _docMouseUp(e);
                    return true;
                }
                dragFlag = 1;
                draggedElement = tools.apply(setting.edit.drag.helper, [e, treeId, [dragNode]]);
                if (draggedElement) {
                    draggedElement.css({
                        cursor: setting.edit.drag.cursor,
                        zIndex: setting.edit.drag.zIndex,
                        opacity: setting.edit.drag.opacity
                    });
                    draggedElement.appendTo($(body));
                }
                tools.apply(setting.callback.onDrag, [e, treeId, [dragNode]]);
            }

            if (dragFlag == 1) {
                var docScrollTop = $(doc).scrollTop(),
                docScrollLeft = $(doc).scrollLeft();

                tools.apply(setting.callback.onDragMove, [e, treeId, [dragNode]]);
            }

            draggedElement && draggedElement.css({
                "top": (e.clientY + docScrollTop - setting.edit.drag.cursorAt.top + 3) + "px",
                "left": (e.clientX + docScrollLeft - setting.edit.drag.cursorAt.left + 3) + "px"
            });
        }

        function _docMouseUp(e) {
            mouseDown = false;
            $(doc).off("mousemove." + setting.namespace, _docMouseMove)
            .off("mouseup." + setting.namespace, _docMouseUp);

            if (dragFlag == 0) {
                return true;
            }

            tools.apply(setting.callback.beforeDrop, [setting.treeId, [dragNode]]);
            tools.apply(setting.callback.onDrop, [e, setting.treeId, [dragNode]]);
            
            draggedElement && draggedElement.remove();
            draggedElement = null;
            dragFlag = 0;
            dragNode = null;
        }
    },
    _unbindEvent = function(setting) {
        var doc = setting.treeObj.get(0).ownerDocument;

        setting.treeObj.off("mousedown." + setting.namespace, "[data-node]")
        .off("mouseup." + setting.namespace, "[data-node]")
        .off("mousemove." + setting.namespace, "[data-node]");
        $(doc).off("mousemove." + setting.namespace).off("mouseup");
    },

    _z = {
        tools: _tools,
        view: _view,
        data: _data
    };
    $.extend(true, $.fn.smartTree.consts, _consts);
    $.extend(true, $.fn.smartTree._z, _z);

    var st = $.fn.smartTree,
    tools = st._z.tools,
    consts = st.consts,
    view = st._z.view,
    data = st._z.data;

    data.exSetting(_setting);
    data.addInitBind(_bindEvent);
    data.addInitUnBind(_unbindEvent);
})(jQuery);

/*
 * JQuery smartTree stDraggable v0.0.01
 *
 * Copyright (c) 2016 Jian.Ma
 *
 * Licensed same as jquery - MIT License
 * http://www.opensource.org/licenses/mit-license.php
 *
 * email: 18551750323@163.com
 * Begin date: 2016-11-06
 */
;(function($) {
    var Draggable = function(options) {
        this.obj = options.obj;
        this.callbacks = options.callbacks || {};
        this.minMoveSize = options.minMoveSize || 5,
        this.helper = options.helper || null,
        this.cursor = options.cursor || "pointer",
        this.cursorAt = options.cursorAt || {
            left: 0,
            top: 0
        },
        this.opacity = options.opacity || 0.5,
        this.zIndex = options.zIndex || 1,
        this.id = options.id;
        this.dragInterval = options.dragInterval || 30;
        this.doc = $(this.obj.get(0).ownerDocument);
        this.dragFlag = 0;
        this.movingFlag = false;
        this.draggedElement = null;
        this.namespace = "dg_" + this.id;
    }
    Draggable.prototype = {
        init: function() {
            this.mouseDownFlag = false;
            this.mouseDownAxis = null;
            this.target = null;

            this.unbindEvent();
            this.bindEvent();
        },
        unbindEvent: function() {
            this.obj.off("mousedown." + this.namespace, this._onMouseDown);
            this.doc.off("mousemove." + this.namespace, this._onMouseMove)
            .off("mouseup", this._onMouseUp);
        },
        bindEvent: function() {
            this.obj.on("mousedown." + this.namespace, null, this, this._onMouseDown);
        },
        _onMouseDown: function(e) {
            var o = e.data;
            o.mouseDownFlag = true;
            o.mouseDownAxis = {
                x: e.clientX,
                y: e.clientY
            }

            o.mouseDownX = e.clientX;
            o.mouseDownY = e.clientY;
            o.draggedElement = this;

            o.doc.on("mousemove." + this.namespace, null, o, o._onMouseMove)
            .on("mouseup." + this.namespace, null, o, o._onMouseUp);

            /* stop propagation */
            return false;
        },
        _onMouseMove: function(e) {
            var o = e.data, offsetX, offsetY;

            if (!o.mouseDownFlag ||
                e.buttons != 1 ||
                e.button == 2) {
                return true;
            }

            offsetX = e.clientX - o.mouseDownX;
            offsetY = e.clientY - o.mouseDownY;

            if (Math.abs(offsetX) < o.minMoveSize &&
                Math.abs(offsetY) < o.minMoveSize) {
                return true;
            }

            /* control moving interval */
            if (!o.movingFlag) {
                o.movingFlag = true;
                setTimeout(function() {
                    o.movingFlag = false;
                }, o.dragInterval);
            } else {
                return true;
            }

            if (o.dragFlag == 0) {
                if (!o._apply(o.callbacks.beforeDrag, [e, o.draggedElement], true)) {
                    _onMouseUp(e);
                    return true;
                }
                o.dragFlag = 1;

                o._apply(o.callbacks.onDrag, [e, o.draggedElement]);
            }

            if (o.dragFlag == 1) {
                o._apply(o.callbacks.onDragMove, [e, o.draggedElement, {x: offsetX, y:offsetY}]);
            }
        },
        _onMouseUp: function(e) {
            var o = e.data;
            o.mouseDownFlag = false;

            if (o.dragFlag == 0) {
                return true;
            }

            if (o._apply(o.callbacks.beforeDrop, [e, o.draggedElement]), true) {
                o._apply(o.callbacks.onDrop, [e, o.draggedElement]);
            }

            o.doc.off("mousemove." + this.namespace, o._onMouseMove)
            .off("mouseup." + this.namespace, o._onMouseUp);

            o.dragFlag = 0;
        },
        _apply: function(fun, param, defaultValue) {
            if ((typeof fun) == "function") {
                return fun.apply("", param?param:[]);
            }
            return defaultValue;
        }
    }

    $.fn.stDraggable = function(params) {
        var el = this[0];
        
        if (!el) {
            return;
        }

        if (typeof(params) == "string") {
            
        } else if (typeof(params) == "object") {
            var draggable = new Draggable({
                obj: this,
                callbacks: params.callbacks,
                id: params.id
            });
            draggable.init();
        }
    }
}(jQuery))

/*
 * JQuery smartTree stScrollbar v0.0.01
 *
 * Copyright (c) 2016 Jian.Ma
 *
 * Licensed same as jquery - MIT License
 * http://www.opensource.org/licenses/mit-license.php
 *
 * email: 18551750323@163.com
 * Begin date: 2016-11-17
 */
;(function($) {
    var Scrollbar = function(options) {
        this.obj = options.obj;
        this.id = options.id;
        this.settings = options.settings;
        this.draggingFlag = false;
        this.minDraggerHeight = 30;
        this.namespace = "sb_" + this.id;
    }

    Scrollbar.prototype = {
        init: function() {
            this.createWrap();
            this.createScrollBar();
            this.bindEvent();
        },
        createWrap: function() {
            var $wrap = $("<div class='st-scroll-box'><div class='st-container show-scrollbar'></div></div>");
            this.obj.children().wrapAll($wrap);
            this.wrapObj = this.obj.find(".st-scroll-box");
        },
        createScrollBar: function() {
            var w = parseInt(this.wrapObj.find(".st-container").css("margin-right"), 10);
            var draggerBarHeight = 20;
            var domString = "" +
            "<div style='width:" + w + "px;' class='st-scrollbar'>" +
            "   <div class='st-draggercontainer'><div style='height:"+draggerBarHeight+"px' class='st-dragger'><div class='st-dragger-bar'></div></div><div class='st-dragger-rail'></div></div>" +
            "</div>"

            $(domString).appendTo(this.wrapObj);
            this.$scrollContainer = this.wrapObj.find(".st-container");
            this.$draggerContainer = this.wrapObj.find(".st-draggercontainer");
            this.$dragger = this.wrapObj.find(".st-dragger");
            this.updateDraggerHeight();
        },
        bindEvent: function() {
            var o = this;
            var originTop = 0;

            this.obj.find(".st-dragger").stDraggable({
                id: this.id,
                dragInterval: o.settings.callbacks.whileScrollingInterval || 30,
                callbacks: {
                    onDrag: function(e, target) {
                        originTop = parseInt($(target).css("top"), 10);
                        o._apply(o.settings.callbacks.onScrollStart, []);
                    },
                    onDragMove: function(e, target, offset) {
                        var draggerContainerHeight = o.obj.find(".st-draggercontainer").height();
                        var draggerHeight = $(target).height();
                        var top = originTop + offset.y;
                        if (top < 0) {
                            top = 0;
                        } else if (top > draggerContainerHeight-draggerHeight) {
                            top = draggerContainerHeight - draggerHeight;
                        }
                        $(target).css("top", top + "px");

                        o.updateScrollTop(top);
                        o._apply(o.settings.callbacks.whileScrolling, []);
                    },
                    onDrop: function(e, target) {
                        o._apply(o.settings.callbacks.onScroll, []);
                    }
                }
            });

            this.obj.find(".st-dragger-rail").off("click." + this.namespace)
            .on("click." + this.namespace, function(e) {
                var top = o.getDraggerTop();
                if (e.offsetY > top) {
                    o.scrollDown();
                } else {
                    o.scrollUp();
                }
            });

            this.wrapObj.unbind("mousewheel." + this.namespace)
            .bind("mousewheel." + this.namespace, function(e, delta, deltaX, deltaY) {
                if (o.$draggerContainer.is(":hidden")) {
                    return true;
                }
                if (!o.draggingFlag) {
                    o.draggingFlag = true;
                    setTimeout(function() {
                        o.draggingFlag = false;
                    }, o.settings.callbacks.whileScrollingInterval || 30);
                } else {
                    return true;
                }

                if (delta > 0) {
                    o.scrollUp();
                } else if (delta < 0) {
                    o.scrollDown();
                }
            })
        },
        getScrollTop: function() {
            return this.$scrollContainer[0].offsetTop;
        },
        getDraggerTop: function() {
            return parseInt(this.$dragger.css("top"), 10) || 0;
        },
        setScrollTop: function(top) {
            if (top == undefined) { return }
            this.$scrollContainer.css("top", top + "px");
        },
        setDraggerTop: function(top) {
            this.$dragger.css("top", top + "px");
        },
        scrollUp: function() {
            var scrollTop = this.getScrollTop();
            var scrollAmount = this.settings.mouseWheel.scrollAmount;
            scrollTop = scrollTop+scrollAmount > 0 ? 0 : scrollTop+scrollAmount;
            this.setScrollTop(scrollTop);
            this.updateDragTop();
            this._apply(this.settings.callbacks.whileScrolling, []);
        },
        scrollDown: function() {
            var scrollHeight = this.$scrollContainer.height() - this.wrapObj.height();
            var scrollTop = this.getScrollTop();
            var scrollAmount = this.settings.mouseWheel.scrollAmount;
            scrollTop = scrollTop-scrollAmount < -scrollHeight ? -scrollHeight : scrollTop-scrollAmount;
            this.setScrollTop(scrollTop);
            this.updateDragTop();
            this._apply(this.settings.callbacks.whileScrolling, []);
        },
        scrollTo: function(pos) {
            var scrollTop = 0;
            if (pos == undefined) {return}
            if (typeof pos == "string") {
                if (/^\d+$/.test(pos)) {
                    scrollTop = parseInt(pos, 10);
                } else {
                    switch (pos) {
                        case "top": {
                            scrollTop = 0;
                            break;
                        }
                    }
                }
            } else if (typeof pos == "number") {
                scrollTop = pos;
            }

            this.updateScrollTop(scrollTop);
            this.updateDragTop();
        },
        updateScrollTop: function(top) {
            var scrollHeight = this.$scrollContainer.height() - this.wrapObj.height();
            var pos = top / (this.obj.find(".st-draggercontainer").height() - this.obj.find(".st-dragger").height());
            var top = -Math.round(pos * scrollHeight);
            this.setScrollTop(top);
        },
        updateDragTop: function() {
            var scrollTop = -this.getScrollTop();
            var scrollHeight = this.$scrollContainer.height() - this.wrapObj.height();
            var draggerContainerHeight = this.obj.find(".st-draggercontainer").height() - this.obj.find(".st-dragger").height();
            var draggerTop = scrollTop / scrollHeight * draggerContainerHeight;
            this.setDraggerTop(draggerTop);
        },
        updateDraggerHeight: function() {
            var scrollContainerHeight = this.$scrollContainer.height();
            var wrapHeight = this.wrapObj.height();
            var draggerContainerHeight = this.obj.find(".st-draggercontainer").height();
            var draggerHeight = draggerContainerHeight * wrapHeight / scrollContainerHeight;
            if (draggerHeight >= draggerContainerHeight) {
                this.$scrollContainer.removeClass("show-scrollbar");
                this.$draggerContainer.hide();
            } else {
                if (draggerHeight < this.minDraggerHeight) {
                    draggerHeight = this.minDraggerHeight;
                }
                this.$scrollContainer.addClass("show-scrollbar");
                this.$dragger.height(draggerHeight);
                this.$draggerContainer.show();
            }
        },
        _apply: function(fun, param, defaultValue) {
            if ((typeof fun) == "function") {
                return fun.apply("", param?param:[]);
            }
            return defaultValue;
        }
    }

    $.fn.stScrollbar = function(params) {
        if (typeof(params) == "string") {
            var sb = $(this).data("stScrollbar");
            if (sb) {
                switch (params) {
                    case "getScrollTop": {
                        return sb.getScrollTop();
                    }
                    case "scrollTo": {
                        sb.scrollTo(arguments[1]);
                        break;
                    }
                    case "update": {
                        sb.updateDraggerHeight();
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        } else if (typeof(params) == "object") {
            if (!$(this).data("stScrollbar")) {
                var scrollbar = new Scrollbar({
                    obj: this,
                    id: params.id,
                    settings: params
                });
                scrollbar.init();
                $(this).data("stScrollbar", scrollbar);
            }
        }
    }
}(jQuery))
