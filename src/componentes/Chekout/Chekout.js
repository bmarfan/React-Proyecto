import { useState, useContext } from "react";
import { CartContext } from "../../context/CartContext";
import { db } from "../../config/firebase";
import { addDoc, collection, getDocs, query, where, writeBatch, documentId, Timestamp } from "firebase/firestore";
import CheckoutForm from "../ChekoutForm/CheckoutForm";
import "./Checkout.css";

const Checkout = () => {
    const [loading, setLoading] = useState(false)
    const [orderId, setOrderId] = useState('')

    const { cart, total, clearCart } = useContext(CartContext)
    
    const createOrder = async ({ nombre, telefono, email }) => {
        setLoading(true)

        try {
            const objOrder = {
                //datos del usuario
                buyer: {
                    nombre, telefono, email
                },
                items: cart,
                total: total,
                date: Timestamp.fromDate(new Date())
            }

            const batch = writeBatch(db)
            const outOfStock = []
            const ids = cart.map(prod => prod.id)
            const productsRef = collection(db, 'items')
            const productsAddedFromFirestore = await getDocs(query(productsRef, where(documentId(), 'in', ids)))
            const { docs } = productsAddedFromFirestore

            docs.forEach(doc => {
                const dataDoc = doc.data()
                const stockDb = dataDoc.stock
                
                const productAddedToCart = cart.find(prod => prod.id === doc.id)
                const prodQuantity = productAddedToCart?.quantity

                if(stockDb >= prodQuantity){
                    batch.update(doc.ref, {stock: stockDb - prodQuantity})
                } else {
                    outOfStock.push({id: doc.id, ...dataDoc})
                }
            })
            if (outOfStock.length === 0){
                await batch.commit()
                const orderRef = collection(db, 'orders')
                const orderAdded = await addDoc(orderRef, objOrder)

                setOrderId(orderAdded.id)
                clearCart()
            } else {
                console.error('Producto fuera de stock')
            }
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

   if (loading) {
        return <h1 className="orderl">Se esta generando su orden...</h1>
    }

    if (orderId) {
        return <h1 className="orderl">El id de su orden es: {orderId}</h1>
    }

    return(
        <div>
            <CheckoutForm onConfirm={createOrder} />
        </div>
    )
}

export default Checkout;