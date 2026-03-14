import '../../index.css';
import { useRef, useState } from 'react';
import { Constants } from '../../data/Constants';
import { useAlert } from '../../contexts/useAlert';
import BackButton from '../../components/BackButton';

function ReportItem({ user, handleBack }) {

  const { showAlert } = useAlert();
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const imageInput = useRef();

  const handleImage = (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleImageInput = () => {
    imageInput.current.click();
  }

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    handleImage(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      event.target.form.image.files = event.dataTransfer.files;
      handleImage(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const form = new FormData();

    form.append("roll_no", event.target.roll.value);
    form.append("description", event.target.description.value);
    form.append("date", event.target.date.value);
    form.append("name", event.target.name.value);
    form.append("contact", event.target.contact.value);
    form.append("item_type", event.target.item_type.value);

    const imageFile = event.target.image.files[0];

    if(new Date(event.target.date.value) > new Date()) {
      showAlert("Invalid date!", "error");
      return;
    }

    if(!imageFile) {
      showAlert("Image required!");
      return;
    }
    
    form.append("image", imageFile);

    const response = await fetch(`${Constants.API}/report-item`, {
      method: "POST",
      credentials: "include",
      body: form
    });

    const data = await response.json();
    showAlert(data.message, response.status == 200 ? "success" : "error");
  };

  return (
    <div className="report-item-outer">
      <form className='item-form' onSubmit={handleSubmit}>
        <div className='item-top-row'>
          <h2>Report an item</h2>
          <BackButton handleBack={handleBack} />
        </div>

        <label htmlFor='roll'>Roll No.</label>
        <input disabled id="roll" name="roll" value={user.roll_no} placeholder={user.roll_no} />

        <label htmlFor='name'>Name</label>
        <input id="name" name="name" type='text'/>

        <label htmlFor='description'>Description (10-300 characters)</label>
        <textarea id='description' name='description' maxLength={300} minLength={10}></textarea>

        <label htmlFor='date'>Date</label>
        <input id="date" name="date" type="date"></input>

        <select id='item_type' name='item_type'>
          <option value='lost'>I lost this item</option>
          <option value='found'>I found this item</option>
        </select>

        <label htmlFor='image'>Upload an image</label>

        <div
          className={`upload-box ${dragActive ? "drag-active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={handleImageInput}
        >
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            required
            onChange={handleImageChange}
            ref={imageInput}
          />

          {imagePreview ? (
            <img src={imagePreview} className="item-image-preview" />
          ) : (
            <p>Drag & drop an image here or click to upload</p>
          )}
        </div>

        <label htmlFor='contact'>{"Contact (Email, phone no. etc.)"}</label>
        <input id="contact" name="contact" type='text'/>

        <button type='submit' className='item-submit-btn'>Submit</button>
      </form>
    </div>
  );
}

export default ReportItem;