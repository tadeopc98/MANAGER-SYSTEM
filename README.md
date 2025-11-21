# Manager Mintaka

Panel de administración en React + Vite que centraliza todos los catálogos operativos de Mintaka: colaboradores, operadores, pulseras, vuelos, bitácora, servicios, soporte, amonestaciones, pasajeros y reportes. Todo el tráfico hacia la API se firma automáticamente con el token JWT obtenido en el login.

## Features principales

- Login con persistencia de sesión (Redux Toolkit + redux-persist).
- Sidebar con navegación a cada recurso `/api/*`.
- CRUD genérico (listar, crear, actualizar, eliminar) con validación para evitar duplicados en campos únicos.
- Formulario dinámico por recurso + editor JSON avanzado para payloads personalizados.
- Búsqueda sobre las columnas visibles, recarga manual y notificaciones con *react-toastify*.

## Requisitos

- Node.js 18+
- Variables configuradas en `src/config.js` (por defecto `http://localhost:3010/`).
- API Mintaka con los endpoints ya disponibles.

## Scripts

```bash
npm install      # Instala dependencias
npm run dev      # Levanta el frontend en modo desarrollo
npm run build    # Genera build de producción
npm run preview  # Sirve la build resultante
```

## Configuración de recursos

Cada recurso se define en `src/constants/resourceConfig.js`. Puedes ajustar:

- `endpoint`: ruta relativa en la API.
- `idField`: campo que usa el backend como identificador (`/:id` en PUT/DELETE).
- `uniqueFields`: campos que deben ser únicos; se validan antes de guardar.
- `fields`: definición de inputs del formulario (tipo, opciones, placeholder).
- `columns`: columnas visibles en la tabla. Si lo omites, se usan los campos del formulario.

Los campos del formulario generan el payload automáticamente. Si necesitas enviar una estructura distinta, usa el área de **Payload avanzado (JSON)** dentro del mismo formulario; en ese caso, el JSON reemplaza por completo al formulario tradicional.

## Flujo de autenticación

1. El usuario ingresa correo y contraseña en `/login`.
2. Se llama a `POST ${API_BASE_URL}auth/login`.
3. El token recibido se guarda en Redux y se persiste en `localStorage`.
4. Todas las llamadas posteriores anexan `Authorization: Bearer <token>` de forma automática desde los hooks del CRUD.

## Validación de duplicados

Antes de crear un registro nuevo se revisan los campos configurados en `uniqueFields`. Si alguno coincide con un registro existente, se bloquea el guardado y se muestra una alerta. Durante una edición el registro actual queda excluido para que puedas mantener su clave primaria.

## Estructura relevante

- `src/pages/Login.jsx`: pantalla de acceso.
- `src/components/layout/*`: barra superior y sidebar.
- `src/components/resource/ResourceManager.jsx`: componente genérico con la tabla/formulario.
- `src/hooks/useCrudResource.js`: hook que hace las llamadas HTTP con axios.

Personaliza estilos en los archivos CSS dentro de `src/components` o agrega componentes adicionales según las necesidades del panel. Con esto tienes un punto de partida funcional para gestionar todos los endpoints listados en tu API.
