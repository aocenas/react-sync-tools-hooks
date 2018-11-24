# Reagent-hooks

A set of hooks to help with state management and data fetching. Main goals are
ease of use and incremental composability while building on top of Redux.
This is a reimplementation of reagent HOCs as hooks.

## Hooks:

### useAction
Allows you to wrap an async action (usually some network fetch) and handling state changes, errors and cancellations.
```typescript

/**
 * Hook that gives you an action object, representing state of some async code
 * (usually a network request).
 * @param actionFunc - Function with async operation
 * @param afterFunc - Function that will be called with the result of the
 * actionFunc. Convenience for cases when you want to do something with the
 * result and do not want to alter the actionFunc (like storing result in global
 * state)
 * @param options - Options are passed to your custom error handler. You can use
 * them to create custom per action error handling logic.
 */
export const useAction = <T extends any = any>(
  actionFunc: ActionFunc,
  afterFunc?: AfterFunc,
  options?: any,
): ActionObject<T>

/**
 * Type of function that should be supplied to the useAction hook. It takes a
 * CancelToken as first argument from axios that can be used if the action is
 * cancelable.
 */
export type ActionFunc = (token: CancelToken, ...args: any[]) => Promise<any>

/**
 * Gets a response of the ActionFunc as first argument and the same set of args
 * as the ActionFunc after that.
 * TODO: Remove the tight coupling with axios
 */
export type AfterFunc = (response: AxiosResponse, ...args: any[]) => void

/**
 * The state of the action which is returned by the hook.
 * The state changes are:
 *
 * Initial:
 *   { isLoading: false }
 *   run() -> Loading
 *
 * Loading:
 *   { isLoading: true }
 *   finish -> Success
 *          -> Failed
 *
 * Success:
 *   { isLoading: false, response }
 *   run() -> Loading
 *
 * Failed:
 *   { isLoading: false, error }
 *   run() -> Loading
 *
 */
interface ActionState<T = any> {
  isLoading: boolean

  // Result of the async operation
  // TODO: at this moment this is tied to axios but could be more generic
  response?: AxiosResponse<T>

  // Any error thrown by the ActionFunc
  error?: any
}

/**
 * This is a structure that is returned by useAction.
 */
export type ActionObject<T = any> = ActionState<T> & {
  // Calling run will start an async operation defined by the action.
  run: (...args: any[]) => () => void
}
```

### useModel
A way to create and use a reusable state with reducers, that can be reused.
The state itself is stored in Redux but is accessible only to components that
explicitly use the model. Each model is stored in its own part of the Redux
so they do not clash.

```typescript
/**
 * Create a model instance that can be later used by useModel. The model
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
): ModelInstance<S, A>

/**
 * Type of function expected to be provided for the model. It is basically a
 * reducer of the state with additional args.
 */
type ActionFunc<S> = (state: S, ...args: any[]) => S
interface ActionObject<S> {
  [name: string]: ActionFunc<S>
}

/**
 * Hook that will return model state and model actions.
 * @param model - Model instance returned by makeModel from which to get the
 * state and actions. To reuse state use the same model instance on multiple
 * places.
 * @param selector - Function where you can return just a portion of the model
 * state and by that reduce number of updates. For example if your model is map
 * of objects you can select only one of them and get updates only when it
 * changes.
 * If you do not specify selector, whole model is returned, if you pass null
 * you won't be updated on model change. Selector needs to be memoized (for
 * example with useCallback) to prevent infinite update loop.
 */
export const useModel = <S, A extends ActionObject<S>, MappedState = any>(
  model: ModelInstance<S, A>,
  selector?: ((state: S) => MappedState) | null,
): [MappedState | null, MappedActions<A>]

/**
 * Actions object returned to the caller. They loose the first state argument
 * as that will be injected. In addition setState action is added to the set
 * of action.
 */
type MappedActions<A, S> = { [P in keyof A]: (...args: any[]) => void } & {
  setState: (args: SetStateArg<S>) => void
}

/**
 * Argument for setState function. It allows a reducer like function instead
 * of a new state, similar to Component.setState
 */
type SetStateArg<S> = S | ((state: S) => void)
```

## HOCs:
As hooks will not be usable everywhere (only functional components), both hooks
are also available as HOCs. 

### withAction
```typescript
/**
 * HOC with same functionality as the useAction hook.
 * @param actionName - Name of the action prop passed into wrapped component.
 * @param actionFunc
 * @param afterFunc
 * @param options
 */
export const withAction = <P extends object>(
  actionName = 'action',
  actionFunc: HocActionFunc<P>,
  afterFunc?: HocAfterFunc<P>,
  options?: any,
) => (WrappedComponent: React.ComponentType<P>)
  
/**
 * Functions similar to those provided to the useAcions hook but with additional
 * props argument.
 */
export type HocActionFunc<P> = (
  token: CancelToken,
  props: P,
  ...args: any[]
) => Promise<any>

export type HocAfterFunc<P> = (
  response: AxiosResponse,
  props: P,
  ...args: any[]
) => void

```

### withModel
```typescript

/**
 * HOC with same functionality as useModel hook.
 * @param model - Model instance created by makeModel.
 * @param stateSelector - Function mapping model state to props.
 * @param actionsSelector - Function mapping model actions to props.
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
    actions: MappedActions<A, S>,
    props: Subtract<P, MappedState & NewMappedActions>,
  ) => NewMappedActions = identity,
) => (WrappedComponent: React.ComponentType<P>)
```

