import { omit } from 'lodash'

import { withModel, makeModel } from '../../src'

export interface Todo {
  id: number
  text: string
  completed: boolean
}

export interface Todos {
  [id: string]: Todo
}

export const todosModel = makeModel(
  'todos',
  {
    addTodo: (state, id, text) => {
      return {
        ...state,
        [id]: {
          id,
          text,
          completed: false,
        },
      }
    },

    completeTodo: (state, id) => {
      return {
        ...state,
        [id]: {
          ...state[id],
          completed: true,
        },
      }
    },

    undoTodo: (state, id) => {
      return {
        ...state,
        [id]: {
          ...state[id],
          completed: false,
        },
      }
    },

    updateTodoText: (state, id, text) => {
      return {
        ...state,
        [id]: {
          ...state[id],
          text,
        },
      }
    },

    deleteTodo: (state, id) => omit(state, id),
  },
  {} as Todos,
)
