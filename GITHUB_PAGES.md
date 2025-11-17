# 🚀 Despliegue en GitHub Pages - Guía Rápida

Esta guía te permitirá desplegar automáticamente tu aplicación React en **GitHub Pages** - totalmente GRATIS y sin necesidad de servidor.

---

## ✅ Ventajas de GitHub Pages

- ✅ **Totalmente gratis** - Sin costos mensuales
- ✅ **HTTPS automático** - Certificado SSL incluido
- ✅ **CDN global** - Tu sitio se sirve desde múltiples ubicaciones mundiales
- ✅ **Despliegue automático** - Al hacer `git push` se actualiza automáticamente
- ✅ **Sin mantenimiento** - GitHub se encarga de todo
- ✅ **Dominio personalizado** - Puedes usar tu propio dominio
- ✅ **Cero configuración de servidor** - No necesitas Windows Server, Linux, etc.

---

## 📋 Pasos para Activar GitHub Pages

### Paso 1: Agregar Secrets en GitHub

Antes de activar Pages, necesitas agregar las credenciales de Backendless:

1. **Ve a la configuración de Secrets:**
   ```
   https://github.com/a01797221AngelBarajas/siavl-dashboard/settings/secrets/actions
   ```

2. **Haz clic en "New repository secret"**

3. **Agrega estos dos secrets:**

   **Secret 1:**
   - **Name:** `VITE_BACKENDLESS_APP_ID`
   - **Value:** Tu App ID de Backendless (lo encuentras en tu `.env` local)

   **Secret 2:**
   - **Name:** `VITE_BACKENDLESS_API_KEY`
   - **Value:** Tu API Key de Backendless (lo encuentras en tu `.env` local)

---

### Paso 2: Habilitar GitHub Pages en el Repositorio

1. **Ve a Settings del repositorio:**
   ```
   https://github.com/a01797221AngelBarajas/siavl-dashboard/settings/pages
   ```

2. **En "Build and deployment":**
   - **Source:** Selecciona **"GitHub Actions"** (NO "Deploy from a branch")

   Debería verse así:
   ```
   Source: GitHub Actions
   ```

3. **¡Eso es todo!** No necesitas configurar nada más en esta pantalla.

---

### Paso 3: Hacer Push de los Archivos de Configuración

Los archivos ya están creados localmente, solo necesitas subirlos:

```bash
cd "e:\ThinkPad\Maestría ITESM 2024\3TAnalisisDisyConstrSoft\S9\Actividad10\siavl-dashboard"

# Agregar los archivos nuevos
git add .github/workflows/github-pages.yml
git add vite.config.ts
git add GITHUB_PAGES.md

# Hacer commit
git commit -m "Configure GitHub Pages deployment"

# Subir al repositorio
git push
```

---

### Paso 4: Ver el Despliegue en Acción

1. **Ve a la pestaña "Actions":**
   ```
   https://github.com/a01797221AngelBarajas/siavl-dashboard/actions
   ```

2. **Verás un workflow ejecutándose:**
   - Nombre: "Deploy to GitHub Pages"
   - Estado: 🟡 En progreso (círculo amarillo girando)

3. **Haz clic en el workflow** para ver el progreso en tiempo real:
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Build project
   - ✅ Upload artifact
   - ✅ Deploy to GitHub Pages

4. **Espera a que termine** (aproximadamente 2-3 minutos)

5. **Cuando veas ✅ verde**, tu sitio estará desplegado

---

## 🌐 Acceder a Tu Sitio Web

Una vez desplegado, tu sitio estará disponible en:

```
https://a01797221angelbarajas.github.io/siavl-dashboard/
```

**Formato general:**
```
https://[nombre-usuario].github.io/[nombre-repositorio]/
```

---

## 🔄 Actualizaciones Automáticas

Cada vez que tú o tus compañeros hagan `git push`:

```bash
# Hacer cambios en el código
git add .
git commit -m "Update feature"
git push
```

**GitHub automáticamente:**
1. Detecta el push
2. Ejecuta el workflow
3. Compila el proyecto (npm run build)
4. Despliega en GitHub Pages
5. Tu sitio se actualiza en 2-3 minutos ✅

**Igual que Lovable, pero gratis e ilimitado!**

---

## 🎯 Usar Dominio Personalizado (Opcional)

Si quieres usar tu propio dominio (ejemplo: `siavl.tudominio.com`):

### Paso 1: Configurar DNS

En tu proveedor de dominio (GoDaddy, Namecheap, etc.), agrega estos registros:

**Opción A - Subdominio (recomendado):**
```
Tipo: CNAME
Host: siavl (o el subdominio que quieras)
Value: a01797221angelbarajas.github.io
TTL: 3600
```

**Opción B - Dominio raíz:**
```
Tipo: A
Host: @
Value: 185.199.108.153
       185.199.109.153
       185.199.110.153
       185.199.111.153
```

### Paso 2: Configurar en GitHub

1. **Ve a Settings → Pages:**
   ```
   https://github.com/a01797221AngelBarajas/siavl-dashboard/settings/pages
   ```

2. **En "Custom domain":**
   - Escribe tu dominio: `siavl.tudominio.com`
   - Clic en "Save"

3. **Espera unos minutos** y marca:
   - ✅ Enforce HTTPS

4. **Actualiza `vite.config.ts`:**
   ```typescript
   base: mode === "production" ? "/" : "/",
   ```
   (Cambia `/siavl-dashboard/` por `/`)

---

## 🔍 Verificar que Todo Funciona

### Checklist:

- [ ] Secrets agregados en GitHub (VITE_BACKENDLESS_APP_ID y VITE_BACKENDLESS_API_KEY)
- [ ] GitHub Pages habilitado con "Source: GitHub Actions"
- [ ] Archivos subidos al repositorio (git push exitoso)
- [ ] Workflow ejecutado sin errores (marca verde ✅)
- [ ] Sitio accesible en: https://a01797221angelbarajas.github.io/siavl-dashboard/
- [ ] Login funciona correctamente
- [ ] Dashboard carga datos de Backendless

---

## 🆚 Comparación: GitHub Pages vs Windows Server vs Lovable

| Característica | GitHub Pages | Windows Server | Lovable |
|----------------|--------------|----------------|---------|
| **Costo** | 🟢 $0/mes | 🔴 $10-50/mes | 🟡 Gratis (limitado) |
| **Configuración** | 🟢 5 minutos | 🔴 1+ horas | 🟢 Ya está |
| **Despliegue auto** | 🟢 Sí | 🟡 Requiere setup | 🟢 Sí |
| **HTTPS** | 🟢 Automático | 🔴 Manual | 🟢 Automático |
| **Mantenimiento** | 🟢 Cero | 🔴 Alto | 🟢 Cero |
| **Velocidad** | 🟢 CDN global | 🟡 Depende | 🟢 Rápido |
| **Límite builds** | 🟢 Ilimitado* | 🟢 Ilimitado | 🔴 Muy limitado |
| **Dominio custom** | 🟢 Gratis | 🟢 Sí | 🟡 Pago |
| **Control total** | 🟡 Limitado | 🟢 Total | 🔴 No |

\* 2,000 minutos/mes (más que suficiente para este proyecto)

---

## 🚨 Troubleshooting

### Problema 1: El workflow falla con "Error: Process completed with exit code 1"

**Causa:** Faltan los Secrets de Backendless

**Solución:**
1. Ve a: https://github.com/a01797221AngelBarajas/siavl-dashboard/settings/secrets/actions
2. Verifica que existen:
   - `VITE_BACKENDLESS_APP_ID`
   - `VITE_BACKENDLESS_API_KEY`
3. Si no existen, agrégalos

---

### Problema 2: El sitio carga pero todo aparece en blanco

**Causa:** Problema con la ruta base en `vite.config.ts`

**Solución:**
1. Verifica que en `vite.config.ts` tienes:
   ```typescript
   base: mode === "production" ? "/siavl-dashboard/" : "/",
   ```
2. El nombre debe coincidir EXACTAMENTE con el nombre del repositorio

---

### Problema 3: Error 404 en las rutas (ej: /usuarios)

**Causa:** GitHub Pages no tiene configuración de SPA

**Solución:**
1. Crear archivo `public/404.html`:
   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="utf-8">
       <title>SIAVL Dashboard</title>
       <script>
         sessionStorage.redirect = location.href;
       </script>
       <meta http-equiv="refresh" content="0;URL='/siavl-dashboard/'"></meta>
     </head>
     <body></body>
   </html>
   ```

2. En `index.html`, agregar al inicio del `<script>`:
   ```javascript
   (function(){
     var redirect = sessionStorage.redirect;
     delete sessionStorage.redirect;
     if (redirect && redirect != location.href) {
       history.replaceState(null, null, redirect);
     }
   })();
   ```

---

### Problema 4: El sitio no se actualiza después de hacer push

**Solución:**
1. Ve a Actions: https://github.com/a01797221AngelBarajas/siavl-dashboard/actions
2. Verifica que el workflow se ejecutó
3. Si no se ejecutó, verifica que hiciste push a la rama `main` (no a otra rama)
4. Espera 2-3 minutos y limpia la caché del navegador (Ctrl + Shift + R)

---

### Problema 5: "GitHub Pages is currently disabled"

**Solución:**
1. Ve a Settings → Pages
2. En "Source", selecciona **"GitHub Actions"** (NO "Deploy from a branch")
3. Guarda los cambios

---

## 📊 Monitoreo del Despliegue

### Ver logs en tiempo real:

1. **Pestaña Actions:**
   ```
   https://github.com/a01797221AngelBarajas/siavl-dashboard/actions
   ```

2. **Haz clic en el workflow más reciente**

3. **Expande los pasos** para ver logs detallados:
   - Build project → Ver si hay errores de compilación
   - Deploy to GitHub Pages → Ver si el despliegue fue exitoso

### Recibir notificaciones:

1. **Settings → Notifications**
2. **Actions → ✅ Enable** para recibir emails cuando falle un despliegue

---

## 🎓 Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `.github/workflows/github-pages.yml` | Workflow de GitHub Actions |
| `vite.config.ts` | Configuración de Vite (base path) |
| `package.json` | Scripts de build |
| `.env` | Variables de entorno (LOCAL - no subir a git) |

---

## 📝 Notas Finales

### ¿Qué hacer con el Windows Server?

**Opción 1 - Cancelar el servidor:**
- Si no lo necesitas para otra cosa, puedes cancelarlo y ahorrar dinero
- GitHub Pages hace todo lo que necesitas

**Opción 2 - Usar para backend:**
- Si en el futuro necesitas servicios backend propios (no Backendless)
- Puedes usar el servidor para APIs, bases de datos, etc.

**Opción 3 - Ambiente de staging:**
- Usar el servidor como ambiente de pruebas
- GitHub Pages como producción

### ¿Lovable sigue siendo útil?

**Sí**, para desarrollo:
- Lovable es excelente para desarrollo rápido
- Pero para producción, GitHub Pages es mejor (sin límites)
- Puedes seguir usando Lovable para hacer cambios rápidos
- Cuando termines, haz push a GitHub y se despliega automáticamente

---

## ✅ Resumen Ejecutivo

**Para activar GitHub Pages:**

1. ✅ Agregar Secrets en GitHub (2 variables de Backendless)
2. ✅ Habilitar GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. ✅ Hacer push de los archivos de configuración
4. ✅ Esperar 2-3 minutos
5. ✅ Visitar: https://a01797221angelbarajas.github.io/siavl-dashboard/

**Después:**
- Cada `git push` actualiza el sitio automáticamente
- Sin costos, sin límites, sin mantenimiento
- Exactamente como Lovable, pero mejor 🚀

---

¿Dudas? Revisa la sección de Troubleshooting o los logs en Actions.