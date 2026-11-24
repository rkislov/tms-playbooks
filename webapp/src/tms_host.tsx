// Copyright 2026 Tayga contributors. Licensed under Apache-2.0.
import React from 'react';
import {formatProductText, productHtmlToComponent} from './tms_markdown';
import {createBrowserHistory} from 'history';
import 'bootstrap/dist/css/bootstrap.css';
import * as ReactDOM from 'react-dom';
import {createRoot} from 'react-dom/client';
import * as Redux from 'redux';
import * as ReactRedux from 'react-redux';
import * as ReactRouterDom from 'react-router-dom';
import * as ReactIntl from 'react-intl';
import * as ReactBootstrap from 'react-bootstrap';
import * as Luxon from 'luxon';
const HostPropTypes = require('prop-types');
import * as ReactJSXRuntime from 'react/jsx-runtime';
import configureStore from 'mattermost-redux/store/configureStore';
import initialState from 'mattermost-redux/store/initial_state';
import reducerRegistry from 'mattermost-redux/store/reducer_registry';
import {Client4} from 'mattermost-redux/client';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {applyTheme} from 'src/components/backstage/css_utils';

const globals = window as any;
Object.assign(globals, {React, ReactDOM: {...ReactDOM, createRoot}, Redux, ReactRedux, ReactRouterDom, ReactIntl, ReactBootstrap, Luxon, PropTypes: HostPropTypes, ReactJSXRuntime});
const base = location.pathname.match(/^\/mm\/[a-z0-9]{26}/)?.[0];
if (!base) {throw new Error('A scoped TMS product URL is required');}
globals.basename = base;
const browserHistory = createBrowserHistory({basename: base});
const openModals = new Map<string, any>();
let renderModals = () => {};
globals.WebappUtils = {
    browserHistory,
    modals: {
        ModalIdentifiers: {},
        openModal: (definition: any) => () => {openModals.set(definition.modalId, definition);renderModals();},
        closeModal: (id: string) => () => {openModals.delete(id);renderModals();},
    },
};
globals.PostUtils = {formatText: formatProductText, messageHtmlToComponent: productHtmlToComponent};
globals.Components = {
    Timestamp: ({value}: any) => React.createElement('time', null, new Date(value).toLocaleString()),
    Textbox: ({value, onChange, placeholder, disabled, rows, id}: any) => React.createElement('textarea', {value, onChange, placeholder, disabled, rows, id, className: 'form-control'}),
};
const nativeFetch = window.fetch.bind(window);
function token() {
    try {return JSON.parse(localStorage.getItem('tayga.tokens') || '{}').access_token || '';} catch {return '';}
}
// Only same-origin scoped requests may receive the session credential.
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url, location.href);
    const headers = new Headers(request.headers);
    if (url.origin === location.origin && (url.pathname.startsWith(base + '/') || url.pathname.startsWith('/api/v4/'))) {headers.set('Authorization', 'Bearer ' + token());}
    return nativeFetch(new Request(request, {headers}));
};
async function loadScript(url: string) {
    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');script.src = url;
        script.onload = () => resolve();script.onerror = () => reject(new Error('Unable to load product bundle'));document.head.appendChild(script);
    });
}
async function boot() {
    const response = await fetch(base + '/products/bootstrap');
    if (!response.ok) {throw new Error('Войдите в TMS и откройте модуль снова (' + response.status + ')');}
    const data = await response.json();
    const state: any = JSON.parse(JSON.stringify(initialState));
    state.entities.general.config = {...data.config, SiteURL: location.origin + base};
    state.entities.users.currentUserId = data.user.id;
    state.entities.users.profiles = Object.fromEntries(data.users.map((u: any) => [u.id, u]));
    state.entities.teams.currentTeamId = data.team.id;
    state.entities.teams.teams = {[data.team.id]: data.team};
    state.entities.teams.myMembers = {[data.team.id]: {team_id: data.team.id, user_id: data.user.id, roles: 'team_user', scheme_user: true}};
    state.entities.channels.channels = Object.fromEntries(data.channels.map((c: any) => [c.id, c]));
    state.entities.channels.channelsInTeam = {[data.team.id]: data.channels.map((c: any) => c.id)};
    state.entities.channels.myMembers = Object.fromEntries(data.channels.map((c: any) => [c.id, {channel_id: c.id, user_id: data.user.id, roles: 'channel_user', scheme_user: true}]));
    state.entities.roles.roles = data.roles;
    state.entities.preferences.myPreferences = Object.fromEntries(data.preferences.map((p: any) => [p.category + '--' + p.name, p]));
    const views = {rhs: {isSidebarExpanded: false}, modals: {modalState: {}}, channel: {}, browser: {}, emoji: {}};
    const store: any = configureStore({preloadedState: state, appReducers: {views: (s = views) => s}, getAppReducers: () => ({views: (s: any = views) => s})});
    applyTheme(getTheme(store.getState()));
    Client4.setUrl(location.origin + base);Client4.setToken(token());
    let product: React.ComponentType<any> | undefined;
    const roots: Array<React.ComponentType<any>> = [];
    const events = new Map<string, (event: any) => void>();
    const reconnect: Array<() => void> = [];
    const instances: any[] = [];
    let messages: any = {};
    let initializationError: Error | undefined;
    const selected = location.pathname.startsWith(base + '/boards') ? 'focalboard' : 'playbooks';
    globals.registerPlugin = (id: string, plugin: any) => {
        if (id !== selected) {throw new Error('Unexpected product bundle');}
        const registry: any = {
            registerReducer: (reducer: any) => reducerRegistry.register('plugins-' + id, reducer),
            registerProduct: (_path: string, _icon: string, _name: string, _url: string, component: React.ComponentType<any>) => {product = component;},
            registerRootComponent: (component: React.ComponentType<any>) => {roots.push(component);return String(roots.length);},
            registerTranslations: (loader: any) => {messages = loader(data.user.locale || "ru") || {};},
            registerSlashCommandWillBePostedHook: () => {},
            registerWebSocketEventHandler: (name: string, handler: (e: any) => void) => {events.set(name, handler);},
            unregisterWebSocketEventHandler: (name: string) => {events.delete(name);},
            registerReconnectHandler: (handler: () => void) => {reconnect.push(handler);},
            registerRightHandSidebarComponent: () => ({rhsId: id, toggleRHSPlugin: () => ({type: 'TMS_PRODUCT_RHS'})}),
            registerChannelHeaderButtonAction: () => '',registerChannelHeaderMenuAction: () => '',registerPostDropdownMenuAction: () => '',
            registerNeedsTeamRoute: () => '',registerPostTypeComponent: () => '',registerPostWillRenderEmbedComponent: () => '',unregisterComponent: () => {},
        };
        try {instances.push(Promise.resolve(plugin.initialize(registry, store)));} catch (error) {initializationError = error as Error;}
    };
    await loadScript(base + '/static/plugins/' + selected + '/main.js');await Promise.all(instances);
    if (initializationError) {throw initializationError;}
    if (!product) {throw new Error('The installed plugin did not register a product');}
    const Product = product;
    const root = createRoot(document.getElementById('root')!);
    const render = () => root.render(
        <ReactRedux.Provider store={store}>
            <ReactIntl.IntlProvider locale={data.user.locale || 'ru'} messages={messages}>
                <ReactRouterDom.Router history={browserHistory}>
                    <ReactRouterDom.Route path={selected === 'focalboard' ? '/boards' : '/playbooks'}>
                        <Product/>{roots.map((Component, i) => <Component key={i}/>)}
                        {Array.from(openModals.values()).map((definition) => {
                            const Dialog = definition.dialogType;
                            const close = () => {openModals.delete(definition.modalId);renderModals();};
                            return <Dialog key={definition.modalId} {...definition.dialogProps} onHide={close} onExited={close}/>;
                        })}
                    </ReactRouterDom.Route>
                </ReactRouterDom.Router>
            </ReactIntl.IntlProvider>
        </ReactRedux.Provider>,
    );
    renderModals = render;render();
    let ws: WebSocket;let stopped = false;let seq = 1;
    const connect = () => {
        ws = new WebSocket(location.origin.replace(/^http/, 'ws') + '/api/v4/websocket');
        ws.onopen = () => ws.send(JSON.stringify({seq: seq++, action: 'authentication_challenge', data: {token: token()}}));
        ws.onmessage = (message) => {const event = JSON.parse(message.data);events.get(event.event)?.(event);};
        ws.onclose = () => {if (!stopped) {setTimeout(() => {connect();reconnect.forEach((f) => f());}, 3000);}};
    };
    const subject = (value: string) => {try {return JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub || value;} catch {return value;}};
    const initialSubject = subject(token());
    const endSession = () => {
        if (stopped) {return;}
        stopped = true;ws?.close();root.unmount();
        document.getElementById('root')!.textContent = 'Сессия завершена. Откройте модуль из TMS.';
        nativeFetch(base + '/products/session', {method: 'DELETE', credentials: 'same-origin'}).catch(() => {});
    };
    window.addEventListener('storage', (event) => {
        if (event.key !== 'tayga.tokens') {return;}
        if (stopped && token()) {location.reload();return;}
        if (!token() || subject(token()) !== initialSubject) {
            endSession();
            if (token()) {location.reload();}
        }
    });
    const renewal = setInterval(() => {
        const currentToken = token();
        if (stopped || !currentToken || subject(currentToken) !== initialSubject) {return;}
        fetch(base + '/products/session', {method: 'POST'}).then((response) => {
            if ((response.status === 401 || response.status === 403) && token() === currentToken) {endSession();}
        }).catch(() => {});
    }, 60000);
    window.addEventListener('pagehide', () => clearInterval(renewal), {once: true});
    connect();window.addEventListener('pagehide', () => {stopped = true;ws?.close();}, {once: true});
}
boot().catch((error) => {document.getElementById('root')!.textContent = error.message;});
