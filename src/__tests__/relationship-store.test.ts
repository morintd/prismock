import { DMMF } from '@prisma/generator-helper';
import { RelationshipStore } from '../lib/relationship-store';
import { FindWhereArgs } from '../lib/types';

const userModel = {
  name: 'User',
  dbName: null,
  fields: [
    {
      name: 'id',
      kind: 'scalar',
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: true,
      isReadOnly: false,
      hasDefaultValue: true,
      type: 'Int',
      default: {
        name: 'autoincrement',
        args: [],
      },
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'posts',
      kind: 'object',
      isList: true,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'Post',
      relationName: 'PostToUser',
      relationFromFields: [],
      relationToFields: [],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'connections',
      kind: 'object',
      isList: true,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'User',
      relationName: 'Connections',
      relationFromFields: [],
      relationToFields: [],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'symmetricalConnections',
      kind: 'object',
      isList: true,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'User',
      relationName: 'Connections',
      relationFromFields: [],
      relationToFields: [],
      isGenerated: false,
      isUpdatedAt: false,
    },
  ],
  primaryKey: null,
  uniqueFields: [],
  uniqueIndexes: [],
  isGenerated: false,
} as DMMF.Model;

const postModel = {
  name: 'Post',
  dbName: null,
  fields: [
    {
      name: 'id',
      kind: 'scalar',
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: true,
      isReadOnly: false,
      hasDefaultValue: true,
      type: 'Int',
      default: {
        name: 'autoincrement',
        args: [],
      },
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'author',
      kind: 'object',
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'User',
      relationName: 'PostToUser',
      relationFromFields: ['authorId'],
      relationToFields: ['id'],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'authorId',
      kind: 'scalar',
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: true,
      hasDefaultValue: false,
      type: 'Int',
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'comments',
      kind: 'object',
      isList: true,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'Comment',
      relationName: 'CommentToPost',
      relationFromFields: [],
      relationToFields: [],
      isGenerated: false,
      isUpdatedAt: false,
    },
  ],
  primaryKey: null,
  uniqueFields: [],
  uniqueIndexes: [],
  isGenerated: false,
} as DMMF.Model;

const commentModel = {
  name: 'Comment',
  dbName: null,
  fields: [
    {
      name: 'id',
      kind: 'scalar',
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: true,
      isReadOnly: false,
      hasDefaultValue: true,
      type: 'Int',
      default: {
        name: 'autoincrement',
        args: [],
      },
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'posts',
      kind: 'object',
      isList: true,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'Post',
      relationName: 'CommentToPost',
      relationFromFields: [],
      relationToFields: [],
      isGenerated: false,
      isUpdatedAt: false,
    },
  ],
  primaryKey: null,
  uniqueFields: [],
  uniqueIndexes: [],
  isGenerated: false,
} as DMMF.Model;

describe('RelationshipStore', () => {
  describe('constructor', () => {
    it('populates the internal relationships', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      expect(store.getRelationships()).toMatchObject({
        Connections: {
          name: 'Connections',
          values: [],
          a: { name: 'connections', type: 'User' },
          b: { name: 'symmetricalConnections', type: 'User' },
        },
        CommentToPost: {
          name: 'CommentToPost',
          values: [],
          a: { name: 'comments', type: 'Comment' },
          b: { name: 'posts', type: 'Post' },
        },
      });
    });
  });

  describe('connectToRelationship', () => {
    it('does nothing if no relationship is found', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'NonExisting', fieldName: 'irrelevant', id: 1, values: { id: 2 } });
      Object.values(store.getRelationships()).forEach(({ values }) => expect(values).toEqual([]));
    });

    it('stores the given connection values', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
      expect(store.findRelationship('CommentToPost')?.values).toEqual([{ a: 2, b: 1 }]);
    });

    it('stores the given connection values idempotently', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
      expect(store.findRelationship('CommentToPost')?.values).toEqual([{ a: 2, b: 1 }]);
    });

    it('stores the given array of connection values', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({
        relationshipName: 'CommentToPost',
        fieldName: 'comments',
        id: 2,
        values: [{ id: 3 }, { id: 4 }],
      });
      expect(store.findRelationship('CommentToPost')?.values).toEqual([
        { a: 3, b: 2 },
        { a: 4, b: 2 },
      ]);
    });

    it('stores the given connection for a symmetrical relationship', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({
        relationshipName: 'Connections',
        fieldName: 'connections',
        id: 1,
        values: { id: 2 },
      });
      expect(store.findRelationship('Connections')?.values).toEqual([{ a: 2, b: 1 }]);
    });
  });

  describe('disconnectFromRelationship', () => {
    it('does nothing if no relationship is found', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.disconnectFromRelationship({
        relationshipName: 'NonExisting',
        fieldName: 'irrelevant',
        id: 1,
        values: { id: 2 },
      });
      Object.values(store.getRelationships()).forEach(({ values }) => expect(values).toEqual([]));
    });

    it('removes the entry from the corresponding relationship', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 3 } });

      store.disconnectFromRelationship({
        relationshipName: 'CommentToPost',
        fieldName: 'comments',
        id: 1,
        values: { id: 3 },
      });

      expect(store.findRelationship('CommentToPost')?.values).toEqual([{ a: 2, b: 1 }]);
    });

    it('stores the given array of connection values', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 3 } });
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 4 } });

      store.disconnectFromRelationship({
        relationshipName: 'CommentToPost',
        fieldName: 'comments',
        id: 1,
        values: [{ id: 3 }, { id: 2 }],
      });

      expect(store.findRelationship('CommentToPost')?.values).toEqual([{ a: 4, b: 1 }]);
    });

    it('removes the entry from the corresponding symmetrical relationship', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({
        relationshipName: 'Connections',
        fieldName: 'connections',
        id: 1,
        values: { id: 2 },
      });
      store.connectToRelationship({
        relationshipName: 'Connections',
        fieldName: 'connections',
        id: 2,
        values: { id: 3 },
      });

      store.disconnectFromRelationship({
        relationshipName: 'Connections',
        fieldName: 'connections',
        id: 2,
        values: { id: 3 },
      });

      expect(store.findRelationship('Connections')?.values).toEqual([{ a: 2, b: 1 }]);
    });
  });

  describe('match - some', () => {
    it('returns 0 if the relationship does not exist', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);

      const match = store.match({
        type: 'NonExisting',
        name: 'irrelevant',
        itemId: 1,
        where: {
          some: {
            id: 1,
          },
        } as FindWhereArgs,
      });

      expect(match).toBe(0);
    });

    it('returns -1 if the relationship exists but the entry does not exist', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);

      store.connectToRelationship({
        relationshipName: 'CommentToPost',
        fieldName: 'comments',
        id: 1,
        values: { id: 2 },
      });

      const match = store.match({
        type: 'Comment',
        name: 'posts',
        itemId: 69,
        where: {
          some: {
            id: 69,
          },
        } as FindWhereArgs,
      });

      expect(match).toBe(-1);
    });

    it('returns 1 if the relationship exists and the entry exists', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);

      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });

      const match = store.match({
        type: 'Comment',
        name: 'posts',
        itemId: 2,
        where: {
          some: {
            id: 1,
          },
        } as FindWhereArgs,
      });

      expect(match).toBe(1);
    });
  });

  describe('match - none', () => {
    it('returns 0 if the relationship does not exist', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);

      const match = store.match({
        type: 'NonExisting',
        name: 'irrelevant',
        itemId: 1,
        where: {
          none: {
            id: 1,
          },
        } as FindWhereArgs,
      });

      expect(match).toBe(0);
    });

    it('returns 1 if the relationship exists and has no entries', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);

      const match = store.match({
        type: 'Comment',
        name: 'posts',
        itemId: 1,
        where: {
          none: {
            id: 2,
          },
        } as FindWhereArgs,
      });

      expect(match).toBe(1);
    });

    it('returns 1 if the relationship exists and the entry does not exist', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);

      store.connectToRelationship({
        relationshipName: 'CommentToPost',
        fieldName: 'comments',
        id: 2,
        values: { id: 2 },
      });

      const match = store.match({
        type: 'Comment',
        name: 'posts',
        itemId: 2,
        where: {
          none: {
            id: 1,
          },
        } as FindWhereArgs,
      });

      expect(match).toBe(1);
    });

    it('returns -1 if the relationship exists and the entry exists', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);

      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });

      const match = store.match({
        type: 'Comment',
        name: 'posts',
        itemId: 2,
        where: {
          none: {
            id: 1,
          },
        } as FindWhereArgs,
      });

      expect(match).toBe(-1);
    });

    describe('match - another case', () => {
      it('returns 0', () => {
        const store = new RelationshipStore([userModel, postModel, commentModel]);

        store.connectToRelationship({
          relationshipName: 'CommentToPost',
          fieldName: 'comments',
          id: 1,
          values: { id: 2 },
        });

        const match = store.match({
          type: 'Comment',
          name: 'posts',
          itemId: 2,
          where: {
            id: 1,
          } as FindWhereArgs,
        });

        expect(match).toBe(-1);
      });
    });
  });

  describe('getRelationshipIds', () => {
    it('does nothing if no relationship is found', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      const ids = store.getRelationshipIds('NonEsisting', 'irrelevant', 1);
      expect(ids).toEqual([]);
    });

    it('returns the ids for the given params', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 1 } });
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 2, values: { id: 1 } });
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 3, values: { id: 3 } });

      expect(store.getRelationshipIds('CommentToPost', 'Comment', 1)).toEqual([1]);
      expect(store.getRelationshipIds('CommentToPost', 'Post', 1)).toEqual([1, 2]);
    });

    it('returns the ids for the given params of a symmetrical relationship', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'Connections', fieldName: 'connections', id: 1, values: { id: 2 } });

      expect(store.getRelationshipIds('Connections', 'connections', 1)).toEqual([2]);
      expect(store.getRelationshipIds('Connections', 'connections', 2)).toEqual([1]);
    });

    it('returns the ids for the given array of ids of a symmetrical relationship', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'Connections', fieldName: 'connections', id: 1, values: { id: 2 } });
      store.connectToRelationship({ relationshipName: 'Connections', fieldName: 'connections', id: 2, values: { id: 3 } });
      store.connectToRelationship({ relationshipName: 'Connections', fieldName: 'connections', id: 3, values: { id: 4 } });

      expect(store.getRelationshipIds('Connections', 'connections', { in: [1, 2] } as FindWhereArgs)).toEqual([2, 3]);
    });
  });

  describe('cleanupRelationships', () => {
    it('cleans the relationships values for the given type and id', () => {
      {
        const store = new RelationshipStore([userModel, postModel, commentModel]);
        store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
        store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 2, values: { id: 2 } });
        store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 3, values: { id: 1 } });

        store.cleanupRelationships({ type: 'Post', id: 2 });
        expect(store.findRelationship('CommentToPost').values).toEqual([{ a: 1, b: 3 }]);
      }
      {
        const store = new RelationshipStore([userModel, postModel, commentModel]);
        store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
        store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 2, values: { id: 2 } });

        store.cleanupRelationships({ type: 'Comment', id: 1 });
        expect(store.findRelationship('CommentToPost').values).toEqual([{ a: 2, b: 2 }]);
      }
    });

    it('cleans the symmetrical relationships values for the given type and id', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({
        relationshipName: 'Connections',
        fieldName: 'connection',
        id: 1,
        values: { id: 2 },
      });
      store.connectToRelationship({
        relationshipName: 'Connections',
        fieldName: 'User',
        id: 1,
        values: { id: 3 },
      });
      store.connectToRelationship({
        relationshipName: 'Connections',
        fieldName: 'connection',
        id: 2,
        values: { id: 3 },
      });

      store.cleanupRelationships({ type: 'User', id: 1 });
      expect(store.findRelationship('Connections').values).toEqual([{ a: 2, b: 3 }]);
    });
  });

  describe('resetValues', () => {
    it('resets the internal relationships values', () => {
      const store = new RelationshipStore([userModel, postModel, commentModel]);
      store.connectToRelationship({ relationshipName: 'CommentToPost', fieldName: 'comments', id: 1, values: { id: 2 } });
      store.connectToRelationship({ relationshipName: 'Connections', fieldName: 'connections', id: 1, values: { id: 2 } });
      store.resetValues();
      Object.values(store.getRelationships()).forEach(({ values }) => expect(values).toEqual([]));
    });
  });
});
