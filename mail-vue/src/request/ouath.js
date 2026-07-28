import http from '@/axios/index.js';

export function oauthGetState() {
    return http.get('/oauth/state')
}

export function oauthLinuxDoLogin(code, state) {
    return http.post('/oauth/linuxDo/login',{code, state})
}

export function oauthBindUser(form) {
    return http.put('/oauth/bindUser', form)
}
