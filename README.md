# IG-Mapas_y_Terrenos
Para este trabajo se ha cogido una imagen de la Península Ibérica sobre la cuál se han colocado las diferentes centrales energéticas del territorio español. Para las diferentes centrales se han creado varios modelos para representarlas y con colores únicos para diferenciarlas más fácilmente.

## Datos escogidos
El CSV utilizado fue obtenido de los datasets de World Resources Institute. Este archivo contiene información de todas los países del mundo pero he decidido centrarme en España, concretamente en la Península Ibérica, para poder usar una imagen con la mayor resolución posible. 

La siguiente tabla muestra las columnas que este archivo CSV posee y los ticks verdes las que se han usado para esta práctica:

| country | country_long | name | gppd_idnr | capacity_mw | latitude | longitude | fuel1 | fuel2 | fuel3 | fuel4 | commissioning_year | owner | source | url | geolocation_source | year_of_capacity_data | generation_gwh_2013 | generation_gwh_2014 | generation_gwh_2015 | generation_gwh_2016 | estimated_generation_gwh |
|---------|--------------|------|-----------|--------------|----------|-----------|--------|--------|--------|--------|-----------------------|--------|--------|-------|----------------------|--------------------------|-------------------------|-------------------------|-------------------------|-------------------------|-------------------------------|
| ✔️ | ✔️ | ✔️ | ❌ | ❌ | ✔️ | ✔️ | ✔️ | ❌ | ❌ | ❌ | ✔️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✔️ |


## Funcionalidades
El trabajo realizado permite el uso de Controls para manejar la cámara con el ratón. Además de la representación de las diferentes centrales energéticas se ha añadido un barra deslizante para elegir el año, mostrando solo las centrales que se habían comisionado en el año elegido o antes. 

También se ha agregado un botón con el que mostrar la generación de gigavatios hora estimada de cada central mediante el uso de una barra de color amarillo en cada una de las centrales, cuyo tamaño depende de la cantidad de energía esperada. 

## Leyenda
A continuación se añade una leyenda para comprender el tipo de combustible en base a los colores de los modelos:
* **Azul oscuro:** Hidroeléctrica
* **Negro**: Carbón
* **Marrón claro**: Petróleo
* **Gris oscuro**:  Nuclear
* **Blanco**: Gas
* **Azul claro**: Eólica
* **Naranja**: Solar
* **Morado**: Residuos
* **Verde oscuro**: biomasa

## Vídeo
**Enlace al vídeo:** https://drive.google.com/file/d/12WvCEoX1bDpW4bQR1UjGWXDchDx0_dFO/view?usp=sharing
