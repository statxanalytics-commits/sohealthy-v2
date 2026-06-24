// Flag global për password recovery flow.
// Vendoset true para verifyOtp(recovery) në login.tsx, që _layout.tsx
// të mos ridrejtojë automatikisht në app para se përdoruesi të caktojë fjalëkalimin e ri.
export const recoveryState = { active: false }
