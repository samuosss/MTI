"""
Populates the database with an initial admin user and demo catalog data
(mirrors the placeholder products used in the frontend mockup).

Run with:  python -m app.seed
"""

import re

from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models.product import Brand, Category, Product, ProductSpec, SpecLabel
from app.models.user import AdminUser

# ── Category tree ────────────────────────────────────────────────────────────
# Each top-level entry: (name, icon, [ (subcategory_name, icon), ... ])
CATEGORY_TREE = [
    (
        "Informatique",
        "laptop",
        [
            ("Laptops", "laptop"),
            ("Desktops", "monitor"),
            ("Workstations", "server"),
            ("Composants PC", "cpu"),
            ("Accessoires Informatique", "mouse"),
        ],
    ),
    (
        "Téléphonie & Tablette",
        "smartphone",
        [
            ("Smartphones", "smartphone"),
            ("Tablettes", "tablet"),
            ("Accessoires Téléphonie", "headphones"),
        ],
    ),
    (
        "Stockage",
        "hard-drive",
        [
            ("Disques Durs", "hard-drive"),
            ("SSD", "hard-drive"),
            ("Clés USB", "usb"),
            ("Stockage Réseau (NAS)", "server"),
        ],
    ),
    (
        "Impression",
        "printer",
        [
            ("Imprimantes", "printer"),
            ("Scanners", "scan"),
            ("Consommables (Toners/Cartouches)", "droplet"),
            ("Accessoires Impression", "printer"),
        ],
    ),
    (
        "Réseau & Sécurité",
        "wifi",
        [
            ("Switches", "network"),
            ("Routeurs", "router"),
            ("Caméras de Sécurité", "camera"),
            ("Pare-feu", "shield"),
            ("Câblage Réseau", "cable"),
        ],
    ),
]

BRANDS = ["LENOVO", "DELL PRECISION", "CISCO SYSTEMS", "HP", "SUPERMICRO", "SYNOLOGY"]

PRODUCTS = [
    dict(
        name="ThinkPad X1 Carbon Gen 11",
        brand="LENOVO",
        category="Laptops",
        specs=[
            (SpecLabel.PROCESSOR, "Intel Core i7-1365U", "13th Gen"),
            (SpecLabel.RAM, "32GB LPDDR5", None),
            (SpecLabel.STORAGE, "1TB NVMe Gen4 SSD", None),
        ],
        price=2149.00,
        original_price=2499.00,
        badge="IN STOCK",
        stock=12,
        description=(
            "The ThinkPad X1 Carbon Gen 11 is the world's lightest 14-inch business laptop. "
            "Features Intel vPro technology, MIL-SPEC durability, and up to 15 hours of battery life."
        ),
    ),
    dict(
        name="Precision 7960 Tower",
        brand="DELL PRECISION",
        category="Desktops",
        specs=[
            (SpecLabel.PROCESSOR, "Xeon W5-2455X", None),
            (SpecLabel.RAM, "64GB ECC RAM", None),
            (SpecLabel.GRAPHICS_CARD, "NVIDIA RTX 6000 Ada", "Ada Lovelace"),
        ],
        price=5899.00,
        original_price=None,
        badge="CUSTOM BUILD",
        stock=5,
        description=(
            "Engineered for 3D rendering, AI/ML training, and large-scale simulations. "
            "Supports dual Xeon processors and up to 2TB of ECC DDR5 RAM."
        ),
    ),
    dict(
        name="Catalyst 9300 48-Port",
        brand="CISCO SYSTEMS",
        category="Switches",
        specs=[
            (SpecLabel.STORAGE, "48x 10/100/1000 PoE+ Ports", None),
        ],
        price=3420.00,
        original_price=None,
        badge=None,
        stock=8,
        description=(
            "Industry-leading enterprise access switching platform with full PoE+ "
            "capability across all 48 ports and stacking bandwidth up to 480 Gbps."
        ),
    ),
    dict(
        name="ZBook Fury 16 G10",
        brand="HP",
        category="Laptops",
        specs=[
            (SpecLabel.PROCESSOR, "Intel Core i9-13950HX", "13th Gen"),
            (SpecLabel.RAM, "64GB DDR5", None),
            (SpecLabel.GRAPHICS_CARD, "NVIDIA RTX 4000", "Ada Lovelace"),
        ],
        price=3899.00,
        original_price=None,
        badge="IN STOCK",
        stock=7,
        description=(
            "HP's most powerful mobile workstation. ISV-certified with NVIDIA RTX 4000 Ada "
            "with 20GB GDDR6 and a DreamColor display."
        ),
    ),
    dict(
        name="SuperServer 2U Rackmount",
        brand="SUPERMICRO",
        category="Workstations",
        specs=[
            (SpecLabel.PROCESSOR, "Dual Xeon SP", None),
            (SpecLabel.RAM, "256GB ECC RAM", None),
            (SpecLabel.STORAGE, "10GbE Dual Port", None),
        ],
        price=8750.00,
        original_price=None,
        badge="CUSTOM BUILD",
        stock=3,
        description=(
            "Dual 4th Gen Intel Xeon Scalable, up to 4TB DDR5 ECC, 24x NVMe U.3 drives."
        ),
    ),
    dict(
        name="DiskStation DS1823xs+",
        brand="SYNOLOGY",
        category="Stockage Réseau (NAS)",
        specs=[
            (SpecLabel.STORAGE, "8-Bay NAS", None),
            (SpecLabel.RAM, "8GB ECC RAM", None),
        ],
        price=1999.00,
        original_price=None,
        badge="IN STOCK",
        stock=15,
        description=(
            "8-bay NAS with AMD Ryzen V1780B quad-core, dual 25GbE, expandable to 180 bays."
        ),
    ),
]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower().strip()).strip("-")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Admin user
        if not db.query(AdminUser).filter_by(email="admin@mti-solutions.com").first():
            db.add(
                AdminUser(
                    email="admin@mti-solutions.com",
                    full_name="MTI Administrator",
                    hashed_password=hash_password("ChangeMe123!"),
                    role="superadmin",
                )
            )
            print("Created admin user: admin@mti-solutions.com / ChangeMe123!")

        # Categories (top-level + subcategories)
        category_map: dict[str, Category] = {}
        for parent_name, parent_icon, children in CATEGORY_TREE:
            parent = db.query(Category).filter_by(slug=slugify(parent_name)).first()
            if not parent:
                parent = Category(name=parent_name, slug=slugify(parent_name), icon=parent_icon)
                db.add(parent)
                db.flush()
            category_map[parent_name] = parent

            for child_name, child_icon in children:
                child_slug = slugify(child_name)
                child = db.query(Category).filter_by(slug=child_slug).first()
                if not child:
                    child = Category(
                        name=child_name, slug=child_slug, icon=child_icon, parent_id=parent.id
                    )
                    db.add(child)
                    db.flush()
                category_map[child_name] = child

        # Brands
        brand_map = {}
        for name in BRANDS:
            brand = db.query(Brand).filter_by(name=name).first()
            if not brand:
                brand = Brand(name=name)
                db.add(brand)
                db.flush()
            brand_map[name] = brand

        # Products (assigned to subcategories)
        for p in PRODUCTS:
            slug = slugify(p["name"])
            if db.query(Product).filter_by(slug=slug).first():
                continue
            product = Product(
                name=p["name"],
                slug=slug,
                description=p["description"],
                price=p["price"],
                original_price=p["original_price"],
                badge=p["badge"],
                stock=p["stock"],
                category_id=category_map[p["category"]].id,
                brand_id=brand_map[p["brand"]].id,
            )
            for label, value, notes in p["specs"]:
                product.specs.append(ProductSpec(label=label, value=value, notes=notes))
            db.add(product)

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()