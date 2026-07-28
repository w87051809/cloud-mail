import http from '@/axios/index.js';

export function loginUserInfo(silent = false) {
    return http.get('/my/loginUserInfo', {noMsg: silent})
}

export function resetPassword(password) {
    return http.put('/my/resetPassword', {password})
}

export function userDelete() {
    return http.delete('/my/delete')
}

