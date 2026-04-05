# Syncra

## Current State
The app has a broken Internet Identity login button — clicking "Connect with Internet Identity" does nothing. The root causes are:
1. `useInternetIdentity.ts` has `authClient` in its `useEffect` dependency array. `setAuthClient()` inside the effect re-triggers the effect, creating an infinite loop that keeps status perpetually `"initializing"` and prevents the login popup from opening.
2. `DEFAULT_IDENTITY_PROVIDER` is set from `process.env.II_URL` which is `undefined` in Vite (browser code). The II popup has no URL to open.
3. `config.ts` uses `process.env.STORAGE_GATEWAY_URL` (also undefined in Vite) instead of the correct fallback.
4. `useActor.ts` calls `_initializeAccessControlWithSecret` without try-catch — if this throws it kills the entire actor.
5. The `clear()` function in `useInternetIdentity` sets `authClient` to `undefined`, which would re-trigger the effect again (same loop issue).

Additional request: Full UI redesign with new color scheme and visual style.

## Requested Changes (Diff)

### Add
- New color palette: warm amber/gold primary with deep navy/charcoal dark background — distinct from the current cold cyan/gray scheme
- Richer glassmorphism with warm-tinted glass surfaces
- New gradient mesh background with warmer tones
- Improved typography hierarchy and spacing

### Modify
- `useInternetIdentity.ts`: Remove `authClient` from `useEffect` deps array; use a ref to track initialization; fix `DEFAULT_IDENTITY_PROVIDER` to use `https://identity.ic0.app` as hardcoded fallback instead of `process.env.II_URL`; fix `clear()` to not set authClient to undefined (just logout and reset identity/status)
- `config.ts`: Fix `storage_gateway_url` to use `https://blob.caffeine.ai` as fallback instead of `process.env.STORAGE_GATEWAY_URL` (which is undefined in Vite)
- `useActor.ts`: Wrap `_initializeAccessControlWithSecret` in try-catch
- `index.css`: New warm amber/gold color tokens for dark and light modes; updated mesh-bg, glass, glass-card utilities with warm tones
- `App.tsx`: Update toaster style to match new warm palette

### Remove
- Nothing removed

## Implementation Plan
1. Fix `useInternetIdentity.ts` — remove authClient from deps, use initRef, hardcode II URL fallback, fix clear()
2. Fix `config.ts` — hardcode storage gateway URL fallback
3. Fix `useActor.ts` — wrap access control init in try-catch
4. Redesign `index.css` — warm amber/gold dark theme with charcoal backgrounds
5. Update `App.tsx` toaster to match new palette
6. Delegate full UI redesign to frontend agent
