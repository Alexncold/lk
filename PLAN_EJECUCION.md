# Plan de ejecucion - Webapp PDF a CSV/XLSX en Firebase (Plan Spark)

## 1. Objetivo
Construir una webapp sencilla (sin autenticacion) para que el usuario:
1. Suba un archivo PDF.
2. Genere una previsualizacion editable de los datos extraidos.
3. Elija formato de salida (`.csv` o `.xlsx`).
4. Descargue el archivo final.

## 2. Stack y lineamientos tecnicos
- Frontend: HTML + CSS + Bootstrap (estetica default de Bootstrap).
- Hosting: Firebase Hosting (Spark).
- Procesamiento: 100% en navegador (sin Cloud Functions).
- Librerias clave:
  - Parseo PDF en cliente: `pdf.js`.
  - Vista/edicion tabular en frontend: tabla HTML editable.
  - Exportacion: `papaparse` (CSV) y `xlsx` (Excel).

## 3. Arquitectura propuesta (compatible Spark)
1. Usuario sube PDF desde la pagina principal.
2. Frontend lee el archivo localmente (sin subir a servidor).
3. `pdf.js` extrae texto y posiciones para inferir estructura tabular.
4. Frontend transforma salida a JSON normalizado:
   - `columns`: nombres de columna.
   - `rows`: arreglo de filas.
5. Frontend renderiza tabla editable con:
   - eliminacion de columnas,
   - edicion de celdas,
   - renombrado de encabezados.
6. Usuario elige formato final (`csv` o `xlsx`) y descarga.

Beneficio: no requiere Blaze ni servicios de backend.
Limitacion: precision menor en PDFs complejos frente a parser backend especializado.

## 4. Fases de ejecucion

### Fase 0 - Definiciones funcionales (0.5 dia)
- Confirmar alcance:
  - Solo procesamiento local en navegador.
  - Sin persistencia de archivos.
- Definir limites iniciales:
  - Tamano maximo sugerido de PDF (ej. 10 MB).
  - Maximo de paginas recomendado (ej. 50).
- Criterio confirmado:
  - Priorizar precision dentro de las capacidades de parseo en cliente.

### Fase 1 - Base del proyecto (0.5 dia)
- Inicializar estructura Hosting:
  - `/public` (HTML/CSS/JS/assets)
- Configurar despliegue Firebase Hosting en Spark.

### Fase 2 - UI con Bootstrap (1 dia)
- Pantalla unica con:
  - selector de archivo PDF,
  - boton "Procesar",
  - estado de carga/error,
  - bloque visual de conversion con fondo blanco,
  - video `spincat.mp4` encima de la barra de progreso,
  - contenedor de previsualizacion,
  - selector de formato y boton de descarga.
- Estilo default Bootstrap (`container`, `card`, `table`, `btn`, `alert`, `progress`).

### Fase 3 - Parseo PDF en frontend (1 a 2 dias)
- Integrar `pdf.js` en cliente.
- Extraer texto por pagina con progreso real por porcentaje.
- Aplicar reglas de inferencia de columnas/filas por posicion horizontal.
- Manejo de errores claros:
  - PDF invalido,
  - PDF protegido,
  - sin datos detectables.

### Fase 4 - Previsualizacion editable (1 dia)
- Renderizar tabla dinamica desde JSON.
- Permitir:
  - editar celdas,
  - eliminar columnas,
  - renombrar encabezados.
- Mantener estado interno de datos editados para exportacion.

### Fase 5 - Exportacion y descarga (0.5 a 1 dia)
- CSV:
  - Generar con delimitador seleccionable en UI (`','` o `';'`).
- XLSX:
  - Generar hoja unica con encabezados + filas.
- Descarga local con nombre sugerido (`archivo_convertido_fecha.ext`).

### Fase 6 - QA y despliegue (1 dia)
- Pruebas funcionales:
  - PDF con tablas simples,
  - PDF multi-pagina,
  - PDF sin tablas.
- Prueba UX de progreso:
  - avance visible durante conversion.
  - render correcto del video del gatito sobre la barra.
- Deploy a Firebase Hosting.

## 5. Requisitos no funcionales minimos
- Prioridad de calidad: maxima precision posible en parseo frontend.
- Tiempo objetivo de parseo: < 20 segundos para archivos pequenos/medianos (dependiente del dispositivo del usuario).
- UX: mensajes claros en cada estado.
- UX: barra de progreso visible durante procesamiento.
- UX: bloque de progreso con fondo blanco y video del gatito (`spincat.mp4`) encima.

## 6. Riesgos y mitigaciones
- PDFs con tablas complejas o escaneados:
  - Mitigacion: permitir edicion manual completa antes de exportar.
- Rendimiento en equipos lentos:
  - Mitigacion: limite de tamano/paginas y mensajes de recomendacion.
- Diferencias regionales en CSV:
  - Mitigacion: selector de delimitador en UI.

## 7. Entregables
1. Webapp desplegada en Firebase Hosting (Spark).
2. Flujo completo local: subir PDF -> previsualizar/editar -> descargar CSV/XLSX.
3. Barra de progreso de conversion en interfaz.
4. Video `spincat.mp4` sobre la barra (fondo blanco).
5. README tecnico de uso y limitaciones.

## 8. Cronograma estimado
- Total: 3 a 5 dias habiles para MVP funcional en Spark.

## 9. Decisiones de alcance cerradas
1. Delimitador CSV: selector en UI.
2. Prioridad: mayor precision posible.
3. Archivos temporales: no se guardan (procesamiento local).
4. UX: incluir barra de progreso durante conversion.
5. UX: video `spincat.mp4` sobre la barra en bloque de fondo blanco.
6. Infraestructura: solo Firebase Hosting compatible con Spark.
