
let cropperAddBanner;
let cropperAddBannerResult;

// BANNER INPUR FIELD CHANGE TIME IMAGE PREVIEW VIEW
const bannerBackground = document.getElementById('bannerBackground');

if(bannerBackground){
    bannerBackground.addEventListener('change',(event) => {

        const backgroundPreview = document.getElementById('bannerBackgroundImg');

        const input = event.target;

        if (input.files && input.files[0]) {

            const reader = new FileReader()

            reader.onload = (e) => {
                backgroundPreview.src = e.target.result;
            }
            reader.readAsDataURL(input.files[0])
        }
    })
}



// BANNER CROPPER MODAL 
const bannerCropperWindow = document.getElementById('banner-background-CropperWindowView');

if(bannerCropperWindow){

    bannerCropperWindow.addEventListener('click',(event) => {
        event.preventDefault();

        const cropperModal = document.getElementById('addBanner-cropper-modal');
        cropperModal.style.display = 'block';

        const inputImg = document.getElementById('bannerBackgroundImg');
        const modalCropperImg = document.getElementById('addBanner-cropper-Image');
        modalCropperImg.src = inputImg.src;

        cropperAddBanner = new Cropper(modalCropperImg , {
            aspectRatio : NaN,
            viewMode:0
        })
         
    })
}

// IMAGE CROPPER MODAL CLOSE
function addBannerCropperClose(){
    const cropperModal = document.getElementById('addBanner-cropper-modal');
    cropperModal.style.display = 'none';

    cropperAddBanner.destroy();
}

// IMAGE CROPPER RESULT TAKEN
const addBannerCropperResult = document.getElementById('bannerCropResult');

if(addBannerCropperResult){

    addBannerCropperResult.addEventListener('click',(event) => {
        event.preventDefault();

        if (cropperAddBanner) {
            const cropperCanvas = cropperAddBanner.getCroppedCanvas();

            if (cropperCanvas) {
                cropperCanvas.toBlob(async (blob) => {
                    const imageElement = document.getElementById("bannerBackgroundImg");
                    imageElement.src = URL.createObjectURL(blob);
                    const customName = "cropped-Banner.png";
                    const file = new File([blob], customName, { type: 'image/png' });
                    cropperAddBannerResult = file;

                });
            }

            cropperAddBanner.destroy(); // Move the destroy call here
        }

        // Hide the modal
        document.getElementById('addBanner-cropper-modal').style.display = "none";
    })
}



// ADD BANNER DATA
const submitAddBannerData = document.getElementById('addBannerForm');

if(submitAddBannerData){

    submitAddBannerData.addEventListener('submit', async(event) => {
        event.preventDefault();

        const bannerResult = document.getElementById('banner-submit-result');


        const form = document.getElementById('addBannerForm');
        const formData = new FormData(form);

        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        if(cropperAddBannerResult){
            formData.set('bannerBackground',cropperAddBannerResult);
        }

        cropperAddBannerResult = undefined;

        if(validateBanner(data)){

            const url = '/admin/addBanner';
            const requestOptions = {
                method:'POST',
                body:formData
            }


            const response = await fetch(url,requestOptions);

                if(!response.ok){
                    window.location.href = '/admin/error500';
                }
            
            const responseData = await response.json();

            if(responseData.success){
                
                window.scroll(0,0);
                bannerResult.setAttribute('class','alert alert-success');
                bannerResult.innerHTML = 'Banner Data Added Sucessful';

                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            }else{
                bannerResult.setAttribute('class','alert alert-danger');
                bannerResult.innerHTML = 'Banner Added Failed Tryagain';
            }
        }else{
            window.scroll(0,0);
        }

    })
}


// VALLIDATE BANNER DATA
function validateBanner(formData){

    const data = formData;

    const errorElemetns = document.querySelectorAll('p[name="validate-banner"]');
    removeErrorElements();

    let is_valid = true;

    

    if(data.bannerOfferName.trim() == ''){

        errorElemetns[0].innerHTML = ' * please fill out this field.';
        is_valid = false;

    }
    if(data.bannerHeading.trim() == ''){

        errorElemetns[1].innerHTML = ' * please fill out this field.';
        is_valid = false;

    }
    if(data.linkPage.trim() == ''){

        errorElemetns[2].innerHTML = ' * please fill out this field.';
        is_valid = false;

    } 
    if(document.getElementById('bannerBackground').files.length == 0){

        errorElemetns[3].innerHTML = ' * upload a image.';
        is_valid = false;

    }
    if(data.bannerDescription.trim() == ''){

        errorElemetns[4].innerHTML = ' * please fill out this field.';
        is_valid = false;

    } 
    return is_valid;
}




// **** REMOVING THE ERROR ELEMENTS IN THE FORM ****
function removeErrorElements(){

    const erroElemetns = document.querySelectorAll('p[name="validate-banner"]');

    erroElemetns.forEach((val)=>{
        val.innerHTML = '';
    })
}

// 
const bannerPreviewAddBrand = document.getElementById('bannerPreview');

if(bannerPreviewAddBrand){

    bannerPreviewAddBrand.addEventListener('click',(event) => {
        event.preventDefault();

        const bannerImagePreview = document.getElementById('bannerImagePreview');

        const checkAddOrEditBanner = event.target.getAttribute('data-addBanner');

        /* PURPOSE OF THIS CONDITION CHECKING ADDBANNER AND EDIT BANNER SAME EVENT FUNCTION IS USED.
        BECAUSE THE WHICH FORM DATA IS A MISS CONSUPTION .AT THAT ADDED DATA ATTRIBUTE AND VALIDATE IT.
        THEN THE VALIDATION BASED TO TAKE THE FORM VALUE */
        let form;
        if(checkAddOrEditBanner == 'true'){
            form = document.getElementById('addBannerForm');
        }else{
            form = document.getElementById('editBannerForm');
        }


        const formData = new FormData(form);

        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }



        /* EDIT BANNER FORM HAVE VIEW THE IMAGE PREVIEW AT THAT TIME.
        WE GO FOR VALIDATE THE INPUT FILE HAVE NO FILE AT THE TIME IT IS NOT WORKING.
        THAT ISSUSE SOLVE USING THE CONDITION "checkAddOrEditBanner == 'false'" */
        if(validateBanner(data) || checkAddOrEditBanner == 'false' ){

            const errorElemetns = document.querySelectorAll('p[name="validate-banner"]');
            errorElemetns[3].innerHTML = '';

            bannerImagePreview.style.display = 'block';

            const image = document.getElementById('bannerBackgroundImg');
            bannerImagePreview.style.backgroundImage = `url("${image.src}")`;

            const banner = document.getElementsByName('banner');

            banner[0].innerHTML = data.bannerOfferName;
            banner[1].innerHTML = data.bannerHeading;
            banner[2].innerHTML = data.bannerDescription;

        }else{
            window.scroll(0,0);
        }
    })
}





// BANNER STATUS CHANGE (LIST OR UNLIST BANNER FUNCTIONALITY)
const bannerStatusChange = document.querySelectorAll('button[name="banneListStatus"]');

if(bannerStatusChange){

    bannerStatusChange.forEach(button => {

        button.addEventListener('click', async(event) =>{
            event.preventDefault();

            Swal.fire({
                text: "Do you want to Change Status?",
                icon: "warning",
                // showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: "Update",
                denyButtonText: `Cancel`,
                customClass: {
                    content: 'custom-swal-text-color'
                }
            }).then(async (result) => {

                if (result.isConfirmed) {

                    //  FETCHING THE BANNER ID AND STATUS VIEW SECTION
                    const bannerId = event.target.getAttribute('data-banner-id');
                    const statusView = document.getElementById(`${bannerId}`);

                    const url = '/admin/statusChange';
                    const requestOptions = {
                        method:'PATCH',
                        body:JSON.stringify({
                            bannerId:bannerId
                        }),
                        headers : {
                            'Content-Type':'application/json'
                        }
                    }

                    const response = await fetch(url,requestOptions);

                        if(!response.ok){
                            window.location.href = '/admin/error500';
                        }

                    const responseData = await response.json();

                        if(responseData.status){
                            statusView.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="25" fill="#008000" class="bi bi-eye-fill ml-auto" viewBox="0 0 16 16">
                                                        <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                                                        <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
                                                    </svg>`

                            event.target.innerHTML = '<i class="bi bi-eye-slash-fill"></i> Unlist';

                            Swal.fire({
                                position:'bottom',
                                html: '<span class="font-weight-bold"><i class="mdi mdi-check-all" style="color: #2dd26c;"></i> Status Updated Successfully.</span>',
                                showConfirmButton: false, 
                                timer: 1800,
                            });
                        }else{
                            statusView.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="25" fill="#FF0000" class="bi bi-eye-slash-fill ml-auto" viewBox="0 0 16 16">
                                                        <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588M5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/>
                                                        <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>
                                                    </svg>`

                            event.target.innerHTML = '<i class="bi bi-eye-fill"></i> List';

                            Swal.fire({
                                position:'bottom',
                                html: '<span class="font-weight-bold"><i class="mdi mdi-check-all" style="color: #2dd26c;"></i> Status Updated Successfully.</span>',
                                showConfirmButton: false, 
                                timer: 1800,
                            });
                        }
                }
            })
        })
    })
}





// EDIT BANNER DATA AND SUBMIT
const submitEditBannerData = document.getElementById('editBannerForm');

if(submitEditBannerData){

    submitEditBannerData.addEventListener('submit', async(event) => {
        event.preventDefault();

        const bannerResult = document.getElementById('banner-submit-result');

        const checkAddOrEditBanner = document.getElementById('ediBannerSubmitBtn').getAttribute('data-addBanner');

         console.log(checkAddOrEditBanner)

        const form = document.getElementById('editBannerForm');
        const formData = new FormData(form);

        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        if(cropperAddBannerResult){
            formData.set('bannerBackground',cropperAddBannerResult);
        }

        if(validateBanner(data) || checkAddOrEditBanner == 'false'){

            const errorElemetns = document.querySelectorAll('p[name="validate-banner"]');
            errorElemetns[3].innerHTML = '';

            const url = '/admin/editBanner';
            const requestOptions = {
                method:'POST',
                body:formData
            }


            const response = await fetch(url,requestOptions);

                if(!response.ok){
                    window.location.href = '/admin/error500';
                }
            
            const responseData = await response.json();

            if(responseData.success){
                
                window.scroll(0,0);
                bannerResult.setAttribute('class','alert alert-success');
                bannerResult.innerHTML = 'Banner Data Edit Sucessful';

                setTimeout(() => {
                    window.location.href = '/admin/viewbanner'
                }, 2000);

            }else{
                bannerResult.setAttribute('class','alert alert-danger');
                bannerResult.innerHTML = 'Banner Edit Failed Tryagain';
            }
        }else{
            window.scroll(0,0);
        }

    })
}