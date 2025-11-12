// Esperar a que todo el HTML esté cargado antes de ejecutar
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Variables Globales ---
    // "Base de datos" en memoria para guardar los datos de los JSON
    let db = {
        clases: [],
        subclases: [],
        objetos: [],
        atributos: [],
        link: [],
        dominios: []
    };

    // --- 2. Selectores del DOM ---
    // Guardamos los elementos HTML que vamos a manipular
    const listaClases = document.getElementById('lista-clases');
    const listaSubclases = document.getElementById('lista-subclases');
    const listaObjetos = document.getElementById('lista-objetos');
    
    // Elementos del Modal
    const modal = document.getElementById('modal-objeto');
    const modalCerrar = document.getElementById('modal-cerrar');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalDefinicion = document.getElementById('modal-definicion');
    const modalGeometria = document.getElementById('modal-geometria');
    const modalTbody = document.getElementById('modal-tbody-atributos');

    // --- 3. Función Principal: Cargar datos y configurar eventos ---
    async function iniciarApp() {
        try {
            // Cargamos todos los JSON en paralelo
            const [clasesRes, subclasesRes, objetosRes, atributosRes, linkRes, dominiosRes] = await Promise.all([
                fetch('datos/clases.json'),
                fetch('datos/subclases.json'),
                fetch('datos/objetos.json'),
                fetch('datos/atributos.json'),
                fetch('datos/link_objeto_atributo.json'),
                fetch('datos/dominios.json')
            ]);

            // Convertimos la respuesta a JSON y la guardamos en nuestra "db"
            db.clases = await clasesRes.json();
            db.subclases = await subclasesRes.json();
            db.objetos = await objetosRes.json();
            db.atributos = await atributosRes.json();
            db.link = await linkRes.json();
            db.dominios = await dominiosRes.json();
            
            // Una vez cargados los datos, dibujamos la primera columna
            renderizarClases();

        } catch (error) {
            console.error("Error fatal al cargar los datos:", error);
            alert("No se pudieron cargar los datos del catálogo. Revisa la consola (F12) para más detalles.");
        }

        // --- 4. Configurar Event Listeners (Manejadores de clics) ---
        
        // Usamos "delegación de eventos" para no asignar un clic a CADA 'li'
        listaClases.addEventListener('click', manejarClicClase);
        listaSubclases.addEventListener('click', manejarClicSubclase);
        listaObjetos.addEventListener('click', manejarClicObjeto);
        
        // Eventos para cerrar el Modal
        modalCerrar.addEventListener('click', () => modal.style.display = "none");
        // Cerrar si se hace clic fuera del contenido del modal
        window.addEventListener('click', (e) => {
            if (e.target == modal) {
                modal.style.display = "none";
            }
        });
    }

    // --- 5. Funciones de "Renderizado" (Dibujar en la pantalla) ---

    function renderizarClases() {
        listaClases.innerHTML = ''; // Limpiar lista
        listaSubclases.innerHTML = '';
        listaObjetos.innerHTML = '';

        for (const clase of db.clases) {
            // Usamos los nombres de columna que definimos en el Excel
            listaClases.innerHTML += `<li data-id="${clase.ID_Clase}">${clase.Nombre_Clase} (${clase.ID_Clase})</li>`;
        }
    }

    function renderizarSubclases(idClasePadre) {
        listaSubclases.innerHTML = ''; // Limpiar
        listaObjetos.innerHTML = '';

        // Filtramos las subclases que coinciden con el ID de la clase padre
        const subclasesFiltradas = db.subclases.filter(s => s.ID_Clase_FK === idClasePadre);

        for (const subclase of subclasesFiltradas) {
            listaSubclases.innerHTML += `<li data-id="${subclase.ID_Subclase}">${subclase.Nombre_Subclase} (${subclase.ID_Subclase})</li>`;
        }
    }

    function renderizarObjetos(idSubclasePadre) {
        listaObjetos.innerHTML = ''; // Limpiar
        
        const objetosFiltrados = db.objetos.filter(o => o.ID_Subclase_FK === idSubclasePadre);

        for (const objeto of objetosFiltrados) {
            listaObjetos.innerHTML += `<li data-id="${objeto.ID_Objeto}">${objeto.Nombre_Objeto} (${objeto.ID_Objeto})</li>`;
        }
    }

    // --- 6. Funciones "Manejadoras" (Lógica de clics) ---

    function manejarClicClase(e) {
        // e.target es el elemento exacto donde se hizo clic
        if (e.target.tagName === 'LI') {
            // Quitar la clase 'seleccionado' de cualquier otro 'li'
            quitarSeleccion(listaClases);
            // Añadir la clase 'seleccionado' al 'li' que se cliqueó
            e.target.classList.add('seleccionado');
            
            // Obtener el ID del atributo 'data-id'
            const idClase = e.target.dataset.id;
            // Dibujar la siguiente columna
            renderizarSubclases(idClase);
        }
    }

    function manejarClicSubclase(e) {
        if (e.target.tagName === 'LI') {
            quitarSeleccion(listaSubclases);
            e.target.classList.add('seleccionado');

            const idSubclase = e.target.dataset.id;
            renderizarObjetos(idSubclase);
        }
    }

    function manejarClicObjeto(e) {
        if (e.target.tagName === 'LI') {
            quitarSeleccion(listaObjetos);
            e.target.classList.add('seleccionado');
            
            const idObjeto = e.target.dataset.id;
            // Mostrar la ventana modal con la info
            mostrarModalObjeto(idObjeto);
        }
    }

    // --- 7. Lógica del Modal (La parte más compleja) ---

    function mostrarModalObjeto(idObjeto) {
        // 1. Encontrar el objeto en nuestra 'db'
        const objeto = db.objetos.find(o => o.ID_Objeto === idObjeto);
        if (!objeto) return; // Salir si no se encuentra

        // 2. Rellenar la info básica del objeto
        modalTitulo.textContent = objeto.Nombre_Objeto;
        modalDefinicion.textContent = objeto.Definicion;
        modalGeometria.textContent = objeto.Geometria;
        modalTbody.innerHTML = ''; // Limpiar la tabla de atributos

        // 3. Encontrar los atributos de ESE objeto (usando la tabla 'link')
        const linksAtributos = db.link.filter(l => l.ID_Objeto_FK === idObjeto);

        for (const link of linksAtributos) {
            // 4. Por cada link, encontrar la info completa del atributo
            const atributo = db.atributos.find(a => a.ID_Atributo === link.ID_Atributo_FK);
            if (!atributo) continue; // Saltar si no se encuentra
            
            let dominiosHtml = "N/A";
            
            // 5. Revisar si el atributo TIENE dominio
            if (atributo.Tiene_Dominio === 'SI') {
                // Si tiene, buscar todos sus valores en la hoja 'Dominios'
                const valoresDominio = db.dominios.filter(d => d.ID_Atributo_FK === atributo.ID_Atributo);
                
                // Formatear como una lista HTML
                dominiosHtml = "<ul>";
                for (const valor of valoresDominio) {
                    dominiosHtml += `<li><b>${valor.Codigo}</b>: ${valor.Etiqueta}</li>`;
                }
                dominiosHtml += "</ul>";
            } else {
                // Si no tiene dominio, solo mostramos el tipo (Ej: Numérico)
                dominiosHtml = `<i>${atributo.Tipo_Atributo || 'N/A'}</i>`;
            }

            // 6. Añadir la fila (<tr>) a la tabla
            // Usamos los nombres de columna de tu hoja 'Atributos'
            modalTbody.innerHTML += `
                <tr>
                    <td>${atributo.Nombre_Atributo} (${atributo.ID_Atributo})</td>
                    <td>${atributo.Definicion}</td>
                    <td>${atributo.Tipo_Atributo}</td>
                    <td>${dominiosHtml}</td>
                    <td>${atributo.Observaciones || ''}</td>
                </tr>
            `;
        }

        // 7. Mostrar el modal
        modal.style.display = "block";
    }

    // --- 8. Funciones de Utilidad ---
    function quitarSeleccion(lista) {
        // Busca cualquier 'li' que tenga la clase 'seleccionado' y se la quita
        const seleccionado = lista.querySelector('li.seleccionado');
        if (seleccionado) {
            seleccionado.classList.remove('seleccionado');
        }
    }

    // --- ¡Iniciar la aplicación! ---
    iniciarApp();
});