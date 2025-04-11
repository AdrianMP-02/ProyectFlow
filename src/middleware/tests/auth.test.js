const { requireLogin, requireProjectAdmin } = require('../auth');

describe('Middleware de autenticación', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = { session: {} };
    res = { redirect: jest.fn() };
    next = jest.fn();
  });
  
  test('requireLogin debería permitir acceso si hay un usuario en sesión', () => {
    req.session.userId = 1;
    requireLogin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
  
  test('requireLogin debería redirigir a login si no hay usuario en sesión', () => {
    requireLogin(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/');
    expect(next).not.toHaveBeenCalled();
  });
});