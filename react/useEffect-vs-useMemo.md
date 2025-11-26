Great question! Actually, **`useMemo` will trigger FEWER renders** than the previous `useEffect` + `useState` implementation.

Let me break down the render cycles:

## Previous Implementation (useEffect + useState)
```typescript
const [databaseList, setDatabaseList] = useState([]);

useEffect(() => {
    if (getDatabaseListResponse) {
        setDatabaseList(formatDatabaseAndSchemaList(getDatabaseListResponse));
    }
}, [getDatabaseListResponse]);
```

**Render sequence:**
1. **Mount render**: `databaseList = []`, `getDatabaseListResponse = undefined`
2. **Props update**: `getDatabaseListResponse = ["db1", "db2"]` → triggers re-render
3. **Re-render**: Component renders with new props
4. **useEffect runs**: Calls `setDatabaseList()` → triggers **another re-render**
5. **Final render**: `databaseList = formatted list`

**Total: 3 renders** (mount + prop update + setState)

## New Implementation (useMemo)
```typescript
const databaseList = useMemo(() => {
    return getDatabaseListResponse
        ? formatDatabaseAndSchemaList(getDatabaseListResponse)
        : [];
}, [getDatabaseListResponse]);
```

**Render sequence:**
1. **Mount render**: `useMemo` calculates `databaseList = []`, `getDatabaseListResponse = undefined`
2. **Props update**: `getDatabaseListResponse = ["db1", "db2"]` → triggers re-render
3. **Re-render**: `useMemo` recalculates during render, `databaseList = formatted list`

**Total: 2 renders** (mount + prop update)

## Key Difference

- **useEffect approach**: Extra render caused by `setState` call
- **useMemo approach**: Calculation happens **during** the render phase, no extra renders

## Benefits of useMemo

✅ **Eliminates the extra render** caused by `setState`  
✅ **Synchronous calculation** - value is ready immediately during render  
✅ **More predictable** - no async state updates  
✅ **Better performance** - fewer render cycles  

So no, `useMemo` won't add extra renders - it actually **removes** one render cycle compared to the previous implementation! 🎉