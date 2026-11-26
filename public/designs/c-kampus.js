(function(){
  var d=document.getElementById('vid'),v=d.querySelector('video');
  document.getElementById('playBtn').addEventListener('click',function(){ v.src='../assets/videos/it-5sinf.mp4'; d.showModal(); v.play().catch(function(){}); });
  document.getElementById('closeVid').addEventListener('click',function(){ d.close(); });
  d.addEventListener('close',function(){ v.pause(); v.removeAttribute('src'); v.load(); });
})();
