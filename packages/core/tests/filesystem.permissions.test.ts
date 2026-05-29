import { FileSystem } from '../src/filesystem';
import {
  AlreadyExistsError,
  GroupNotFoundError,
  PermissionDeniedError,
  UserNotFoundError,
} from '../src/errors';

describe('FileSystem - permissions and users', () => {
  it('starts as root and root can access nodes without explicit grants', () => {
    const fs = new FileSystem();
    fs.mkdir('/private');
    fs.createFile('/private/notes.txt');
    fs.writeFile('/private/notes.txt', 'root secret');

    expect(fs.currentUser()).toBe('root');
    expect(fs.ls('/private')).toEqual(['notes.txt']);
    expect(fs.readFile('/private/notes.txt')).toBe('root secret');
  });

  it('switches users and denies access without a matching user or group grant', () => {
    const fs = new FileSystem();
    fs.mkdir('/private');
    fs.createUser('alice');

    fs.switchUser('alice');

    expect(fs.currentUser()).toBe('alice');
    expect(() => fs.ls('/private')).toThrow(PermissionDeniedError);
    expect(() => fs.createFile('/private/alice.txt')).toThrow(PermissionDeniedError);
  });

  it('allows group members to inherit read permission from a group grant', () => {
    const fs = new FileSystem();
    fs.mkdir('/shared');
    fs.createFile('/shared/readme.txt');
    fs.writeFile('/shared/readme.txt', 'hello team');
    fs.createUser('alice');
    fs.createGroup('engineering');
    fs.addUserToGroup('alice', 'engineering');
    fs.grantGroup('/shared', 'engineering', { read: true });
    fs.grantGroup('/shared/readme.txt', 'engineering', { read: true });

    fs.switchUser('alice');

    expect(fs.ls('/shared')).toEqual(['readme.txt']);
    expect(fs.readFile('/shared/readme.txt')).toBe('hello team');
    expect(() => fs.writeFile('/shared/readme.txt', 'changed')).toThrow(PermissionDeniedError);
  });

  it('requires write permission on the parent directory to create child nodes', () => {
    const fs = new FileSystem();
    fs.mkdir('/workspace');
    fs.createUser('alice');
    fs.grantUser('/workspace', 'alice', { read: true });

    fs.switchUser('alice');

    expect(() => fs.createFile('/workspace/note.txt')).toThrow(PermissionDeniedError);

    fs.switchUser('root');
    fs.grantUser('/workspace', 'alice', { read: true, write: true });
    fs.switchUser('alice');
    fs.createFile('/workspace/note.txt');
    fs.writeFile('/workspace/note.txt', 'owned by alice');

    expect(fs.readFile('/workspace/note.txt')).toBe('owned by alice');
  });

  it('validates users and groups for permission management', () => {
    const fs = new FileSystem();
    fs.mkdir('/project');
    fs.createUser('alice');
    fs.createGroup('engineering');

    expect(() => fs.createUser('alice')).toThrow(AlreadyExistsError);
    expect(() => fs.createGroup('engineering')).toThrow(AlreadyExistsError);
    expect(() => fs.switchUser('missing')).toThrow(UserNotFoundError);
    expect(() => fs.addUserToGroup('missing', 'engineering')).toThrow(UserNotFoundError);
    expect(() => fs.addUserToGroup('alice', 'missing')).toThrow(GroupNotFoundError);
    expect(() => fs.grantUser('/project', 'missing', { read: true })).toThrow(UserNotFoundError);
    expect(() => fs.grantGroup('/project', 'missing', { read: true })).toThrow(GroupNotFoundError);
  });
});
