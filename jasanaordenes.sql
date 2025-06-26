DO $$ 
BEGIN
    -- Tipo ENUM: area
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'area') THEN
        CREATE TYPE area AS ENUM (
            'patronaje', 'corte', 'bordado', 'ensamble', 
            'plancha', 'calidad', 'operaciones', 'admin', 'envios'
        );
    END IF;

    -- Tipo ENUM: order_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('active', 'completed', 'cancelled');
    END IF;

    -- Tipo ENUM: transfer_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status') THEN
        CREATE TYPE transfer_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;

    -- Tipo ENUM: notification_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error');
    END IF;

    -- Tipo ENUM: urgency
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency') THEN
        CREATE TYPE urgency AS ENUM ('urgente', 'intermedio', 'poco_urgente');
    END IF;

    -- Tipo ENUM: reposition_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reposition_type') THEN
        CREATE TYPE reposition_type AS ENUM ('repocision', 'reproceso');
    END IF;

    -- Tipo ENUM: reposition_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reposition_status') THEN
        CREATE TYPE reposition_status AS ENUM ('pendiente', 'aprobado', 'completado', 'cancelado');
    END IF;

END $$;

-- Tabla users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    area area NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users USING BTREE (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON users USING BTREE (id);

-- Tabla orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    folio TEXT UNIQUE NOT NULL,
    cliente_hotel TEXT NOT NULL,
    no_solicitud TEXT NOT NULL,
    no_hoja TEXT,
    modelo TEXT NOT NULL,
    tipo_prenda TEXT NOT NULL,
    color TEXT NOT NULL,
    tela TEXT NOT NULL,
    total_piezas INTEGER NOT NULL,
    current_area area NOT NULL DEFAULT 'corte'::area,
    status order_status NOT NULL DEFAULT 'active'::order_status,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    completed_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_folio_unique ON orders USING BTREE (folio);
CREATE UNIQUE INDEX IF NOT EXISTS orders_pkey ON orders USING BTREE (id);

-- Tabla order_history
CREATE TABLE IF NOT EXISTS order_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    from_area area,
    to_area area,
    pieces INTEGER,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS order_history_pkey ON order_history USING BTREE (id);

-- Tabla order_pieces
CREATE TABLE IF NOT EXISTS order_pieces (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    area area NOT NULL,
    pieces INTEGER NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS order_pieces_pkey ON order_pieces USING BTREE (id);

-- Tabla transfers
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    from_area area NOT NULL,
    to_area area NOT NULL,
    pieces INTEGER NOT NULL,
    status transfer_status NOT NULL DEFAULT 'pending'::transfer_status,
    notes TEXT,
    created_by INTEGER NOT NULL,
    processed_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    processed_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS transfers_pkey ON transfers USING BTREE (id);

-- Tabla notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    transfer_id INTEGER,
    order_id INTEGER,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_pkey ON notifications USING BTREE (id);

-- Tabla session
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS session_pkey ON session USING BTREE (sid);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session USING BTREE (expire);

-- Tabla reposition_history
CREATE TABLE reposition_history (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    from_area VARCHAR(50),
    to_area VARCHAR(50),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT reposition_history_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Tabla reposition_pieces
CREATE TABLE reposition_pieces (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    talla TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    folio_original TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Tabla reposition_transfers
CREATE TABLE reposition_transfers (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    from_area VARCHAR(50) NOT NULL,
    to_area VARCHAR(50) NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    processed_by INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    processed_at TIMESTAMP,

    CONSTRAINT reposition_transfers_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.users(id),
    CONSTRAINT reposition_transfers_processed_by_fkey
        FOREIGN KEY (processed_by) REFERENCES public.users(id)
);

-- Tabla admin_passwords
CREATE TABLE admin_passwords (
    id SERIAL PRIMARY KEY,
    password TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT admin_passwords_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Crear tabla repositions
CREATE TABLE IF NOT EXISTS repositions (
    id SERIAL PRIMARY KEY,
    folio TEXT UNIQUE NOT NULL,
    type reposition_type NOT NULL,
    solicitante_nombre TEXT NOT NULL,
    solicitante_area area NOT NULL,
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT now(),
    no_solicitud TEXT NOT NULL,
    no_hoja TEXT,
    causante_dano TEXT NOT NULL,
    descripcion_suceso TEXT NOT NULL,
    modelo_prenda TEXT NOT NULL,
    tela TEXT NOT NULL,
    color TEXT NOT NULL,
    tipo_pieza TEXT NOT NULL,
    urgencia urgency NOT NULL,
    observaciones TEXT,
    current_area area NOT NULL,
    status reposition_status NOT NULL DEFAULT 'pendiente',
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT repositions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
    CONSTRAINT repositions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);


ALTER TYPE reposition_status ADD VALUE 'eliminado';
ALTER TABLE notifications
ADD COLUMN reposition_id INTEGER REFERENCES repositions(id);
CREATE INDEX IF NOT EXISTS idx_notifications_reposition_id ON notifications(reposition_id);
ALTER TYPE notification_type ADD VALUE 'reposition_deleted';

ALTER TYPE notification_type ADD VALUE 'new_reposition';
ALTER TYPE reposition_status ADD VALUE 'rechazado';
