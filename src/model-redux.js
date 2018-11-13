import _ from 'lodash'
const actionPrefix = '@reagent/modelUpdate'

export const modelSetStateActionCreator = (modelId, newStateOrFunc) => (
  dispatch,
  getState,
) => {

  let payload = newStateOrFunc
  if (typeof newStateOrFunc === 'function') {
    payload = newStateOrFunc(getState().reagent[modelId])
  }

  dispatch({
    type: [actionPrefix, modelId, 'setState'].join('/'),
    payload,
  })
}

export const modelUpdateActionCreator = (modelId, actionName, ...args) => {
  return {
    type: [actionPrefix, modelId, actionName].join('/'),
    payload: args,
  }
}

export const reducer = (state = {}, action) => {
  if (!_.startsWith(action.type, actionPrefix)) {
    return state
  }

  const [, , modelId, actionName] = action.type.split('/')

  if (actionName === 'setState') {
    return {
      ...state,
      [modelId]: action.payload,
    }
  } else {
    return {
      ...state,
      [modelId]: reducers[modelId][actionName](
        state[modelId],
        ...action.payload,
      ),
    }
  }
}

const reducers = {}

export const registerReducer = (modelId, actionName, func) => {
  reducers[modelId] = reducers[modelId] || {}
  reducers[modelId][actionName] = func
}
