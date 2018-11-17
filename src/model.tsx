import identity = require('lodash/identity')
import * as React from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { ThunkDispatch } from 'redux-thunk'

import {
  modelSetStateActionCreator,
  modelUpdateActionCreator,
  registerReducer,
} from './model-redux'
import { Subtract, usePropsChangedToken } from './utils'

const { useMemo, useCallback } = React

/**
 * Type of function expected to be provided for the model. It is basically a
 * reducer of the state with additional args.
 */
type ActionFunc<S> = (state: S, ...args: any[]) => S
interface ActionObject<S> {
  [name: string]: ActionFunc<S>
}

interface ModelInstance<S, A extends ActionObject<S>> {
  /**
   * Id is a name of the model plus some random string for uniqueness.
   */
  id: string
  actions: ActionObject<S>
  defaultState: S
}

/**
 * Create a model instance that can be later used by withModel. The model
 * represents a single instance of state in the redux store so if you use
 * single model instance on multiple places, you will get the same actions and
 * the same data.
 * @param name - Just a string identifier, mainly to be able to see the part of
 * redux store where the data is stored and discern the redux actions when
 * debuggind.
 * @param actions - A set of reducers tied to this model.
 * @param defaultState
 */
export const makeModel = <S extends any, A extends ActionObject<S>>(
  name: string,
  actions: A,
  defaultState: S,
): ModelInstance<S, A> => {
  if (actions.setState) {
    throw new Error(
      'setState is provided automatically, you do not need to specify it.',
    )
  }

  // Generate a semi random identifier.
  // TODO this is not ideal when doing hot reload as the ID will be recreated
  // and the data practically lost.
  const id =
    name +
    '__' +
    Math.random()
      .toString(32)
      .substr(2, 8)

  // Add the reducers to a map so that real redux reducer can find it.
  Object.keys(actions).forEach((key) => {
    registerReducer(id, key, actions[key])
  })

  return {
    id,
    actions,
    defaultState,
  }
}

// This is used if caller of useModel is not interested in state updates
const nullSelector = () => null

type ReduxStore = {
  reagent: { [modelId: string]: any }
}

/**
 * Actions object returned to the caller. In addition setState action is
 * injected.
 */
type MappedActions<A> = { [P in keyof A]: (...args: any[]) => void } & {
  setState: (...args: any[]) => void
}

/**
 * HOC that will inject model state and model actions into the component.
 * @param model - Model instance from which to get the state and actions. To
 * reuse state use the same model instance on multiple places.
 * @param selector - Function where you can return just a portion of the model
 * state and reduce number of updates. For example if your model is map of
 * objects you can select only one of them and get updates only when it changes.
 * If you do not specify selector, whole model is returned, if you pass null
 * you won't be updated on model change. Selector needs to be memoized (for
 * example with useCallback) to prevent infinite update loop.
 */
export const useModel = <S, A extends ActionObject<S>, MappedState = any>(
  model: ModelInstance<S, A>,
  selector?: ((state: S) => MappedState) | null,
): [MappedState | null, MappedActions<A>] => {
  // Handle null or undefined selector here. Make sure the selected functions
  // are constant.
  const realSelector = (selector === null
    ? nullSelector
    : selector === undefined
    ? identity
    : selector) as (state: S) => MappedState | null

  const mapState = useCallback(
    (state: ReduxStore) =>
      realSelector(
        state.reagent[model.id] === undefined
          ? model.defaultState
          : state.reagent[model.id],
      ),
    [model, selector],
  )

  const requestedState = useMappedState(mapState)
  const dispatch = useDispatch()

  const modelActions = useMemo(() => mapModelActions(model, dispatch), [
    model,
    dispatch,
  ])

  return [requestedState, modelActions]
}

/**
 * Argument for setState function. It allows a reducer like function instead
 * of a new state, similar to Component.setState
 */
type SetStateArg<S> = S | ((state: S) => void)

/**
 * Map actions through dispatch and add setState.
 * @param model
 * @param dispatch
 */
const mapModelActions = <S, A extends ActionObject<S>>(
  model: ModelInstance<S, A>,
  dispatch: ThunkDispatch<S, undefined, any>,
): MappedActions<A> => {
  const actionsMapped = Object.keys(model.actions).reduce(
    (acc, key) => {
      acc[key] = (...args: any[]) => {
        dispatch(modelUpdateActionCreator(model.id, key, ...args))
      }
      return acc
    },
    {} as any,
  ) as MappedActions<A>

  actionsMapped.setState = (funcOrObj: SetStateArg<S>) => {
    dispatch(modelSetStateActionCreator(model.id, funcOrObj))
  }
  return actionsMapped
}

/**
 * HOC with same functionality as useModel hook.
 * @param model
 * @param stateSelector
 * @param actionsSelector
 */
export const withModel = <
  S,
  A extends ActionObject<S>,
  MappedState extends {},
  NewMappedActions extends {},
  P
>(
  model: ModelInstance<S, A>,
  stateSelector: (
    state: S,
    props: Subtract<P, MappedState & NewMappedActions>,
  ) => MappedState,
  actionsSelector: (
    actions: MappedActions<A>,
    props: Subtract<P, MappedState & NewMappedActions>,
  ) => NewMappedActions = identity,
) => (WrappedComponent: React.ComponentType<P>) => {
  return (props: Subtract<P, MappedState & NewMappedActions>) => {
    const changeToken = usePropsChangedToken(props)
    const stateSelectorMemoized = useCallback(
      (state: S) => stateSelector(state, props),
      [changeToken],
    )
    const [state, actions] = useModel(model, stateSelectorMemoized)
    const selectedActions = actionsSelector(actions, props)
    return <WrappedComponent {...props} {...state} {...selectedActions} />
  }
}
